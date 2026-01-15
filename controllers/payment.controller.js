const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Pricing plans configuration
const PRICING_PLANS = {
  pro: {
    name: 'Pro Plan',
    priceId: process.env.STRIPE_PRO_PRICE_ID, // Monthly recurring price
    amount: 1200, // $12.00 in cents
    interval: 'month',
    features: ['Unlimited AI resumes', '20+ premium templates', 'Priority support'],
  },
  business: {
    name: 'Business Plan',
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID, // Monthly recurring price
    amount: 4900, // $49.00 in cents
    interval: 'month',
    features: ['Everything in Pro', 'Team management', 'API access', 'Custom branding'],
  },
};

/**
 * Create Stripe Checkout Session
 * POST /api/payment/create-session
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    console.log('🔵 Creating checkout session...');
    console.log('Request body:', req.body);
    console.log('User:', req.user ? { id: req.user._id, email: req.user.email } : 'Not authenticated');

    const { planType } = req.body; // 'pro' or 'business'
    const userId = req.user?._id;

    // Validate user authentication
    if (!userId) {
      console.error('❌ User not authenticated');
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated. Please sign in first.' 
      });
    }

    // Validate plan type
    if (!planType) {
      console.error('❌ Plan type is missing');
      return res.status(400).json({ 
        success: false, 
        error: 'Plan type is required' 
      });
    }

    if (!PRICING_PLANS[planType]) {
      console.error('❌ Invalid plan type:', planType);
      return res.status(400).json({ 
        success: false, 
        error: `Invalid plan type: ${planType}. Must be 'pro' or 'business'` 
      });
    }

    // Validate Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Stripe is not configured properly. Please contact support.' 
      });
    }

    const plan = PRICING_PLANS[planType];

    if (!plan.priceId) {
      console.error(`❌ Stripe Price ID is missing for ${planType} plan`);
      console.error(`   Expected env variable: STRIPE_${planType.toUpperCase()}_PRICE_ID`);
      return res.status(500).json({ 
        success: false, 
        error: `Stripe Price ID not configured for ${planType} plan. Please contact support.` 
      });
    }

    console.log(`✅ Plan validated: ${planType}`, { priceId: plan.priceId, amount: plan.amount });

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found in database:', userId);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    console.log(`✅ User found: ${user.email}`);

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      console.log('🔵 Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });
      customerId = customer.id;
      console.log(`✅ Stripe customer created: ${customerId}`);
      
      // Save customer ID to database
      user.stripeCustomerId = customerId;
      await user.save();
      console.log('✅ Customer ID saved to database');
    } else {
      console.log(`✅ Using existing Stripe customer: ${customerId}`);
    }

    // Validate FRONTEND_URL
    if (!process.env.FRONTEND_URL) {
      console.error('❌ FRONTEND_URL is not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Frontend URL not configured. Please contact support.' 
      });
    }

    console.log('🔵 Creating Stripe Checkout Session...');
    console.log('Session config:', {
      customer: customerId,
      priceId: plan.priceId,
      mode: 'subscription',
      successUrl: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancelUrl: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
      metadata: {
        userId: user._id.toString(),
        plan: planType, // Use 'plan' as specified in requirements
        planType: planType, // Keep both for backward compatibility
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          plan: planType, // Use 'plan' as specified in requirements
          planType: planType, // Keep both for backward compatibility
        },
      },
    });

    const serverPort = process.env.PORT || '3006';
    console.log(`✅ [CHECKOUT] Checkout session created successfully!`);
    console.log(`   Server Port: ${serverPort}`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Session URL: ${session.url}`);
    console.log(`   User: ${user.email} (ID: ${user._id})`);
    console.log(`   Plan: ${planType}`);
    console.log(`   Metadata: userId=${user._id.toString()}, planType=${planType}`);
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   ✅ Backend running on port ${serverPort} - webhook will receive events`);

    // Return ONLY url as per requirements
    res.json({
      url: session.url,
    });

  } catch (error) {
    console.error('❌ ERROR creating checkout session:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    
    // Send detailed error to frontend in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Stripe Error: ${error.message}` 
      : 'Failed to create checkout session. Please try again or contact support.';
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

/**
 * Handle Stripe Webhooks
 * POST /api/payment/webhook
 */
exports.handleWebhook = async (req, res) => {
  const serverPort = process.env.PORT || '3006';
  console.log(`\n📥 [WEBHOOK] ========================================`);
  console.log(`📥 [WEBHOOK] Webhook request received`);
  console.log(`📥 [WEBHOOK] ========================================`);
  console.log(`   Server Port: ${serverPort}`);
  console.log(`   Method: ${req.method}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   Headers:`);
  console.log(`     - Content-Type: ${req.headers['content-type'] || 'missing'}`);
  console.log(`     - Stripe-Signature: ${req.headers['stripe-signature'] ? 'present' : 'MISSING'}`);
  console.log(`     - Content-Length: ${req.headers['content-length'] || 'unknown'}`);
  console.log(`   ✅ Webhook endpoint listening on port ${serverPort}`);
  
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Validate webhook secret configuration
  if (!webhookSecret) {
    console.error('❌ [WEBHOOK] CRITICAL: STRIPE_WEBHOOK_SECRET is not configured in .env');
    console.error('   Set STRIPE_WEBHOOK_SECRET=whsec_... in backend/.env');
    console.error('   For local dev with Stripe CLI, use: stripe listen --forward-to localhost:3006/api/payment/webhook');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!sig) {
    console.error('❌ [WEBHOOK] CRITICAL: Missing stripe-signature header');
    console.error('   This request is not from Stripe or is malformed');
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;

  try {
    // CRITICAL: Verify webhook signature using STRIPE_WEBHOOK_SECRET
    // This ensures the webhook is actually from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log(`✅ [WEBHOOK] ✅ Signature verified successfully ✅`);
    console.log(`   Webhook is authentic and from Stripe`);
  } catch (err) {
    console.error('❌ [WEBHOOK] ❌❌❌ SIGNATURE VERIFICATION FAILED ❌❌❌');
    console.error(`   Error: ${err.message}`);
    console.error('   Possible causes:');
    console.error('   1. Wrong STRIPE_WEBHOOK_SECRET in .env');
    console.error('   2. Request not from Stripe (security issue)');
    console.error('   3. Webhook secret mismatch (test vs live)');
    console.error('   4. Using Stripe CLI? Get new secret with: stripe listen');
    console.error('   5. Raw body parser not configured correctly');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 [WEBHOOK] Event received:`);
  console.log(`   Type: ${event.type}`);
  console.log(`   ID: ${event.id}`);
  console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        console.log(`\n📋 [WEBHOOK] Processing checkout.session.completed`);
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        console.log(`\n📋 [WEBHOOK] Processing customer.subscription.created`);
        // This is critical - subscription.created fires after checkout.session.completed
        // and ensures plan is updated even if checkout.session.completed webhook fails
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log(`\n📋 [WEBHOOK] Processing customer.subscription.updated`);
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log(`\n📋 [WEBHOOK] Processing customer.subscription.deleted`);
        await handleSubscriptionCancelled(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log(`\n📋 [WEBHOOK] Processing invoice.payment_succeeded`);
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log(`\n📋 [WEBHOOK] Processing invoice.payment_failed`);
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`ℹ️  [WEBHOOK] Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt (prevents Stripe retries)
    res.json({ received: true, processed: true });

  } catch (error) {
    console.error('\n❌ [WEBHOOK] Error processing webhook:');
    console.error('   Event type:', event.type);
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    
    // Still return 200 to prevent infinite retries for non-transient errors
    // Log the error for manual investigation
    res.status(200).json({ 
      received: true, 
      processed: false, 
      error: 'Webhook processing failed but acknowledged' 
    });
  }
};

/**
 * Handle successful checkout completion
 * This is the PRIMARY handler for payment confirmation - single source of truth
 */
async function handleCheckoutCompleted(session) {
  console.log(`\n🔔 [WEBHOOK] checkout.session.completed received`);
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Payment Status: ${session.payment_status}`);
  console.log(`   Customer: ${session.customer}`);
  console.log(`   Subscription: ${session.subscription || 'N/A'}`);
  
  // Extract metadata - STRICT: ONLY use metadata, never req.user
  // Check session.metadata first (primary location)
  let userId = session.metadata?.userId;
  const planType = session.metadata?.plan || session.metadata?.planType;
  const userEmail = session.customer_details?.email || session.customer_email;
  
  // Log all metadata locations for debugging
  console.log(`   Session metadata:`, JSON.stringify(session.metadata || {}, null, 2));
  console.log(`   User ID from metadata: ${userId}`);
  console.log(`   Plan from metadata: ${planType}`);
  console.log(`   Email from session: ${userEmail || 'N/A'}`);
  
  // Fallback: Try to find user by email if userId is missing
  if (!userId && userEmail) {
    console.log(`⚠️  [WEBHOOK] userId not in metadata, trying to find user by email: ${userEmail}`);
    try {
      const userByEmail = await User.findOne({ email: userEmail });
      if (userByEmail) {
        userId = userByEmail._id.toString();
        console.log(`✅ [WEBHOOK] Found user by email: ${userEmail} (ID: ${userId})`);
      }
    } catch (emailError) {
      console.error(`❌ [WEBHOOK] Error finding user by email:`, emailError.message);
    }
  }
  
  // If not in session.metadata, check subscription metadata (fallback)
  if (!userId && session.subscription) {
    console.log(`⚠️  [WEBHOOK] userId not found, will check subscription metadata`);
  }
  
  // Validate required data - STRICT: Must have userId (from metadata or email lookup)
  if (!userId) {
    console.error('❌ [WEBHOOK] CRITICAL: Missing userId in session.metadata and could not find by email');
    console.error('   This webhook cannot process without userId');
    console.error('   Session metadata:', JSON.stringify(session.metadata || {}, null, 2));
    console.error('   Session email:', userEmail || 'N/A');
    console.error('   Checkout session creation must include userId in metadata');
    return;
  }
  
  if (!planType) {
    console.error('❌ [WEBHOOK] CRITICAL: Missing plan/planType in session.metadata');
    console.error('   This webhook cannot process without plan in metadata');
    console.error('   Session metadata:', JSON.stringify(session.metadata || {}, null, 2));
    console.error('   Checkout session creation must include plan in metadata');
    return;
  }
  
  // Validate plan type
  const normalizedPlanType = planType.toLowerCase();
  if (!['pro', 'business'].includes(normalizedPlanType)) {
    console.error(`❌ [WEBHOOK] Invalid plan type: ${planType}`);
    return;
  }
  
  // Only process if payment was successful
  if (session.payment_status !== 'paid') {
    console.log(`⚠️  [WEBHOOK] Payment status is '${session.payment_status}', not 'paid'. Skipping update.`);
    return;
  }
  
  try {
    // STRICT: Identify user ONLY using metadata userId (never req.user)
    // This ensures webhook is the single source of truth
    const user = await User.findById(userId);
    
    if (!user) {
      console.error(`❌ [WEBHOOK] CRITICAL: User not found with userId from metadata: ${userId}`);
      console.error(`   This means the userId in checkout session metadata is invalid`);
      console.error(`   Checkout session was created with userId: ${userId}`);
      console.error(`   User must exist in database before payment can be processed`);
      return;
    }
    
    // Security: Verify user's customer ID matches if present
    if (session.customer && user.stripeCustomerId && user.stripeCustomerId !== session.customer) {
      console.error(`❌ [WEBHOOK] SECURITY: Customer ID mismatch!`);
      console.error(`   User's customer ID: ${user.stripeCustomerId}`);
      console.error(`   Session customer ID: ${session.customer}`);
      console.error(`   This could indicate a security issue`);
      // Still proceed but log the warning
    }
    
    console.log(`✅ [WEBHOOK] User found: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);
    console.log(`   Current subscription ID: ${user.stripeSubscriptionId || 'none'}`);
    
    // Get subscription details from Stripe for accurate expiration
    let subscription = null;
    let subscriptionId = session.subscription;
    
    if (subscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log(`✅ [WEBHOOK] Retrieved subscription from Stripe: ${subscriptionId}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Current period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
      } catch (stripeError) {
        console.error(`❌ [WEBHOOK] Failed to retrieve subscription from Stripe:`, stripeError.message);
        // Continue with session data as fallback
      }
    }
    
    // Calculate plan expiration from subscription or use default
    let planExpiresAt;
    if (subscription && subscription.current_period_end) {
      planExpiresAt = new Date(subscription.current_period_end * 1000);
      console.log(`   Using subscription period end: ${planExpiresAt.toISOString()}`);
    } else {
      // Fallback: 1 month from now (should rarely happen)
      planExpiresAt = new Date();
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
      console.log(`⚠️  [WEBHOOK] No subscription period found, using fallback: ${planExpiresAt.toISOString()}`);
    }
    
    // Prepare update data - Update BOTH role and plan
    const updateData = {
      role: normalizedPlanType, // Update role field
      plan: normalizedPlanType, // Update plan field
      planStartedAt: new Date(),
      planExpiresAt: planExpiresAt,
    };
    
    // Only update subscription ID if we have one
    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
    }
    
    // Idempotency check: Prevent duplicate upgrades
    // If user already has the same active plan with same subscription, skip
    const isDuplicate = subscriptionId && 
                        user.stripeSubscriptionId === subscriptionId && 
                        user.plan === normalizedPlanType &&
                        user.planExpiresAt &&
                        user.planExpiresAt > new Date();
    
    if (isDuplicate) {
      console.log(`ℹ️  [WEBHOOK] Idempotency: User already has ${normalizedPlanType} plan with subscription ${subscriptionId}`);
      console.log(`   Plan: ${user.plan}, Expires: ${user.planExpiresAt.toISOString()}`);
      console.log(`   Skipping update (webhook already processed)`);
      return;
    }
    
    // Log what will be updated
    console.log(`📝 [WEBHOOK] Preparing to update user plan:`);
    console.log(`   Current: ${user.plan || 'free'} → New: ${normalizedPlanType}`);
    console.log(`   Subscription ID: ${subscriptionId || 'N/A'}`);
    console.log(`   Plan expires: ${planExpiresAt.toISOString()}`);
    
    // Atomic update using findOneAndUpdate for true idempotency
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );
    
    if (!updatedUser) {
      console.error(`❌ [WEBHOOK] Failed to update user: ${userId}`);
      return;
    }
    
    console.log(`\n✅ [WEBHOOK] ✅✅✅ USER PLAN & ROLE SUCCESSFULLY UPDATED ✅✅✅`);
    console.log(`   User: ${updatedUser.email} (ID: ${updatedUser._id})`);
    console.log(`   Role: ${user.role || 'free'} → ${updatedUser.role}`);
    console.log(`   Plan: ${user.plan || 'free'} → ${updatedUser.plan}`);
    console.log(`   Subscription ID: ${updatedUser.stripeSubscriptionId || 'N/A'}`);
    console.log(`   Plan started: ${updatedUser.planStartedAt?.toISOString()}`);
    console.log(`   Plan expires: ${updatedUser.planExpiresAt?.toISOString()}`);
    console.log(`   ✅ Payment verified via webhook (single source of truth)`);
    console.log(`   ✅ Role & Plan updated in MongoDB`);
    console.log(`   ✅ User will see updated plan on next /auth/me call\n`);
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error updating user plan after checkout completion:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    // Don't throw - webhook should return 200 to prevent retries for non-transient errors
  }
}

/**
 * Handle subscription creation (customer.subscription.created)
 * This fires after checkout.session.completed and ensures plan is updated
 * Critical backup mechanism if checkout.session.completed webhook fails
 */
async function handleSubscriptionCreated(subscription) {
  console.log(`\n🔔 [WEBHOOK] customer.subscription.created received`);
  console.log(`   Subscription ID: ${subscription.id}`);
  console.log(`   Status: ${subscription.status}`);
  console.log(`   Customer: ${subscription.customer}`);
  
  const userId = subscription.metadata?.userId || subscription.metadata?.user_id;
  const planType = subscription.metadata?.planType || subscription.metadata?.plan_type;
  
  console.log(`   User ID from metadata: ${userId}`);
  console.log(`   Plan type from metadata: ${planType}`);
  
  // Determine plan type from price ID if not in metadata
  let determinedPlanType = planType ? planType.toLowerCase() : null;
  if (!determinedPlanType && subscription.items?.data?.[0]?.price?.id) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      determinedPlanType = 'pro';
      console.log(`   Determined plan type from price ID: pro`);
    } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
      determinedPlanType = 'business';
      console.log(`   Determined plan type from price ID: business`);
    }
  }
  
  if (!determinedPlanType || !['pro', 'business'].includes(determinedPlanType)) {
    console.error(`❌ [WEBHOOK] Could not determine plan type for subscription: ${subscription.id}`);
    // Still try to update with subscription details even without plan type
  }
  
  try {
    // Find user by subscription ID or userId
    let user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (!user && userId) {
      console.log(`⚠️  [WEBHOOK] User not found by subscription ID, trying userId: ${userId}`);
      user = await User.findById(userId);
      
      if (user) {
        // Update subscription ID
        if (user.stripeSubscriptionId !== subscription.id) {
          console.log(`✅ [WEBHOOK] Updating user's subscription ID: ${subscription.id}`);
          user.stripeSubscriptionId = subscription.id;
          await user.save();
        }
      }
    }
    
    // If still not found, try by customer ID
    if (!user && subscription.customer) {
      console.log(`⚠️  [WEBHOOK] User not found by subscription ID or userId, trying customer ID: ${subscription.customer}`);
      user = await User.findOne({ stripeCustomerId: subscription.customer });
      
      if (user) {
        // Update subscription ID
        user.stripeSubscriptionId = subscription.id;
        await user.save();
        console.log(`✅ [WEBHOOK] Found user by customer ID and updated subscription ID`);
      }
    }
    
    if (!user) {
      console.error(`❌ [WEBHOOK] User not found for subscription: ${subscription.id}`);
      return;
    }
    
    console.log(`✅ [WEBHOOK] Found user: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);
    
    // Only update if subscription is active and we have a plan type
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      if (determinedPlanType && ['pro', 'business'].includes(determinedPlanType)) {
        // Calculate expiration
        let planExpiresAt;
        if (subscription.current_period_end) {
          planExpiresAt = new Date(subscription.current_period_end * 1000);
        } else {
          // Fallback to 1 month
          planExpiresAt = new Date();
          planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
        }
        
        // Update user role and plan atomically
        const updateData = {
          role: determinedPlanType, // Update role
          plan: determinedPlanType, // Update plan
          planExpiresAt: planExpiresAt,
          stripeSubscriptionId: subscription.id,
        };
        
        // Only set planStartedAt if not already set
        if (!user.planStartedAt) {
          updateData.planStartedAt = new Date();
        }
        
        // Check if update is needed (idempotency)
        const needsUpdate = 
          user.plan !== determinedPlanType ||
          user.stripeSubscriptionId !== subscription.id ||
          !user.planExpiresAt ||
          user.planExpiresAt.getTime() !== planExpiresAt.getTime();
        
        if (needsUpdate) {
          const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $set: updateData },
            { new: true, runValidators: true }
          );
          
          if (updatedUser) {
            console.log(`\n✅ [WEBHOOK] User plan updated via subscription.created!`);
            console.log(`   User: ${updatedUser.email}`);
            console.log(`   Plan: ${updatedUser.plan} (was: ${user.plan || 'free'})`);
            console.log(`   Subscription ID: ${updatedUser.stripeSubscriptionId}`);
            console.log(`   Plan expires: ${updatedUser.planExpiresAt?.toISOString()}\n`);
          }
        } else {
          console.log(`ℹ️  [WEBHOOK] User already has correct plan, no update needed`);
        }
      } else {
        console.log(`⚠️  [WEBHOOK] Subscription is active but could not determine plan type`);
        // Still update expiration if available
        if (subscription.current_period_end) {
          user.planExpiresAt = new Date(subscription.current_period_end * 1000);
          await user.save();
          console.log(`✅ [WEBHOOK] Updated plan expiration from subscription period`);
        }
      }
    } else {
      console.log(`⚠️  [WEBHOOK] Subscription status is '${subscription.status}', not updating plan`);
    }
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing subscription creation:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

/**
 * Handle subscription updates (renewal, plan changes)
 * This handles subscription lifecycle events after initial checkout
 */
async function handleSubscriptionUpdate(subscription) {
  console.log(`\n🔔 [WEBHOOK] Subscription update received: ${subscription.id}`);
  console.log(`   Status: ${subscription.status}`);
  console.log(`   Current period end: ${subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : 'N/A'}`);
  
  const userId = subscription.metadata?.userId || subscription.metadata?.user_id;
  const planType = subscription.metadata?.planType || subscription.metadata?.plan_type;
  
  console.log(`   User ID from metadata: ${userId}`);
  console.log(`   Plan type from metadata: ${planType}`);
  
  try {
    // First try to find user by subscription ID (most reliable)
    let user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (!user && userId) {
      // Fallback: find by userId and update subscription ID
      console.log(`⚠️  [WEBHOOK] User not found by subscription ID, trying userId: ${userId}`);
      user = await User.findById(userId);
      
      if (user) {
        // Update subscription ID if missing or different
        if (user.stripeSubscriptionId !== subscription.id) {
          console.log(`✅ [WEBHOOK] Updating user's subscription ID: ${subscription.id}`);
          user.stripeSubscriptionId = subscription.id;
          await user.save();
        }
      }
    }
    
    if (!user) {
      console.error(`❌ [WEBHOOK] User not found for subscription: ${subscription.id}`);
      return;
    }
    
    console.log(`✅ [WEBHOOK] Found user: ${user.email}`);
    
    // Process subscription update
    await updateSubscriptionDetails(user, subscription, planType);
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing subscription update:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

/**
 * Helper function to update subscription details
 * Handles plan updates, renewals, and status changes
 */
async function updateSubscriptionDetails(user, subscription, planType) {
  console.log(`✅ [WEBHOOK] Updating subscription details for user: ${user.email}`);
  
  const updateData = {};
  const normalizedPlanType = planType ? planType.toLowerCase() : null;
  
  // Determine plan type from metadata or price ID
  let determinedPlanType = normalizedPlanType;
  if (!determinedPlanType && subscription.items?.data?.[0]?.price?.id) {
    const priceId = subscription.items.data[0].price.id;
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      determinedPlanType = 'pro';
      console.log(`   Determined plan type from price ID: pro`);
    } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
      determinedPlanType = 'business';
      console.log(`   Determined plan type from price ID: business`);
    }
  }
  
  // Handle subscription status
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Active subscription - ensure user has paid plan
    if (determinedPlanType && ['pro', 'business'].includes(determinedPlanType)) {
      updateData.role = determinedPlanType; // Update role
      updateData.plan = determinedPlanType; // Update plan
      console.log(`   Setting role and plan to: ${determinedPlanType}`);
    } else if (!user.plan || user.plan === 'free') {
      // If we can't determine plan but subscription is active, keep existing or default to pro
      console.log(`⚠️  [WEBHOOK] Could not determine plan type, keeping existing: ${user.plan || 'free'}`);
    }
    
    // Update expiration from subscription period
    if (subscription.current_period_end) {
      updateData.planExpiresAt = new Date(subscription.current_period_end * 1000);
      console.log(`   Updated expiration to: ${updateData.planExpiresAt.toISOString()}`);
    }
    
    // Set plan start if not already set
    if (!user.planStartedAt) {
      updateData.planStartedAt = new Date();
      console.log(`   Set plan start date: ${updateData.planStartedAt.toISOString()}`);
    }
    
  } else if (subscription.status === 'canceled' || 
             subscription.status === 'unpaid' || 
             subscription.status === 'incomplete_expired' ||
             subscription.status === 'past_due') {
    // Subscription cancelled or failed - downgrade to free
    console.log(`   Subscription status is '${subscription.status}', downgrading to free`);
    updateData.role = 'free'; // Update role
    updateData.plan = 'free'; // Update plan
    updateData.planExpiresAt = null;
    updateData.stripeSubscriptionId = null;
  }
  
  // Only update if we have changes
  if (Object.keys(updateData).length > 0) {
    // Use atomic update
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (updatedUser) {
      console.log(`✅ [WEBHOOK] Subscription details updated for user ${updatedUser.email}`);
      console.log(`   Plan: ${updatedUser.plan}`);
      console.log(`   Expires: ${updatedUser.planExpiresAt?.toISOString() || 'N/A'}`);
    }
  } else {
    console.log(`ℹ️  [WEBHOOK] No updates needed for user ${user.email}`);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription) {
  console.log(`\n🔔 [WEBHOOK] customer.subscription.deleted received`);
  console.log(`   Subscription ID: ${subscription.id}`);
  console.log(`   Status: ${subscription.status}`);
  
  try {
    // First try to find user by subscription ID
    let user = await User.findOne({ stripeSubscriptionId: subscription.id });
    
    if (!user) {
      // If not found by subscription ID, try to find by metadata
      const userId = subscription.metadata?.userId || subscription.metadata?.user_id;
      if (userId) {
        console.log(`⚠️  [WEBHOOK] User not found by subscription ID, trying userId: ${userId}`);
        user = await User.findById(userId);
        if (user && user.stripeSubscriptionId !== subscription.id) {
          console.log(`⚠️  [WEBHOOK] User had different subscription ID, updating to: ${subscription.id}`);
        }
      }
    }
    
    if (!user) {
      console.error(`❌ [WEBHOOK] User not found for subscription cancellation: ${subscription.id}`);
      return;
    }
    
    console.log(`✅ [WEBHOOK] Found user: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);
    
    // Downgrade to free plan using atomic update
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          role: 'free', // Update role
          plan: 'free', // Update plan
          planExpiresAt: null,
          stripeSubscriptionId: null,
        }
      },
      { new: true, runValidators: true }
    );
    
    if (updatedUser) {
      console.log(`✅ [WEBHOOK] User ${updatedUser.email} downgraded to free plan after subscription cancellation`);
      console.log(`   Plan: ${updatedUser.plan}`);
      console.log(`   Subscription ID cleared\n`);
    }
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing subscription cancellation:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

/**
 * Handle successful payment (invoice.payment_succeeded)
 * This handles recurring payments after initial checkout
 */
async function handlePaymentSucceeded(invoice) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    console.log('⚠️  [WEBHOOK] Invoice has no subscription ID, skipping payment update');
    return;
  }
  
  console.log(`\n🔔 [WEBHOOK] invoice.payment_succeeded received`);
  console.log(`   Invoice ID: ${invoice.id}`);
  console.log(`   Subscription: ${subscriptionId}`);
  console.log(`   Amount paid: $${(invoice.amount_paid / 100).toFixed(2)}`);
  
  try {
    // First try to find user by subscription ID
    let user = await User.findOne({ stripeSubscriptionId: subscriptionId });
    
    if (!user) {
      // If not found by subscription ID, try to find by metadata in invoice
      const userId = invoice.metadata?.userId || invoice.customer_details?.metadata?.userId;
      if (userId) {
        console.log(`⚠️  [WEBHOOK] User not found by subscription ID, trying userId: ${userId}`);
        user = await User.findById(userId);
        if (user) {
          // Update the subscription ID if it was different
          if (user.stripeSubscriptionId !== subscriptionId) {
            console.log(`✅ [WEBHOOK] Updating user's subscription ID: ${subscriptionId}`);
            user.stripeSubscriptionId = subscriptionId;
            await user.save();
          }
        }
      }
    }
    
    if (!user) {
      console.error(`❌ [WEBHOOK] User not found for invoice: ${invoice.id}`);
      return;
    }
    
    console.log(`✅ [WEBHOOK] Found user: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);
    
    // Update plan expiration from invoice period
    if (invoice.period_end) {
      const newExpiration = new Date(invoice.period_end * 1000);
      
      // Only update if expiration is in the future and different
      if (newExpiration > new Date() && (!user.planExpiresAt || user.planExpiresAt.getTime() !== newExpiration.getTime())) {
        user.planExpiresAt = newExpiration;
        await user.save();
        console.log(`✅ [WEBHOOK] Updated plan expiration to: ${newExpiration.toISOString()}`);
      } else {
        console.log(`ℹ️  [WEBHOOK] Plan expiration already up-to-date or in past`);
      }
    }
    
    // Ensure user has a paid plan if subscription is active
    if (user.plan === 'free' || !user.plan) {
      console.log(`⚠️  [WEBHOOK] User has free plan but payment succeeded. This should be handled by checkout.session.completed or subscription.created`);
      // Don't auto-upgrade here - let the subscription webhook handle it
    }
    
    console.log(`✅ [WEBHOOK] Payment processing completed for user ${user.email}\n`);
    
  } catch (error) {
    console.error('❌ [WEBHOOK] Error processing successful payment:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    console.log('⚠️  Invoice has no subscription ID, skipping failed payment processing');
    return;
  }
  
  console.log(`🔔 Payment failed for invoice: ${invoice.id}, subscription: ${subscriptionId}`);
  
  try {
    // First try to find user by subscription ID
    let user = await User.findOne({ stripeSubscriptionId: subscriptionId });
    
    if (!user) {
      // If not found by subscription ID, try to find by metadata in invoice
      const userId = invoice.metadata?.userId || invoice.customer_details?.metadata?.userId;
      if (userId) {
        user = await User.findById(userId);
        if (user && user.stripeSubscriptionId !== subscriptionId) {
          console.log(`⚠️  User had different subscription ID, updating to: ${subscriptionId}`);
          user.stripeSubscriptionId = subscriptionId;
          await user.save();
        }
      }
    }
    
    if (!user) {
      console.error('❌ User not found for failed invoice:', invoice.id);
      return;
    }
    
    console.error(`❌ Payment failed for user ${user.email}, subscription: ${subscriptionId}`);
    
    // You could send an email notification here
    // Or implement retry logic
    // For now, we'll log this event
    console.log(`   User ${user.email} has a failed payment, subscription may be at risk`);
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
  }
}

/**
 * Verify and update payment status from Stripe
 * POST /api/payment/verify-session
 * This is a backup mechanism if webhooks fail or are delayed
 * Should only be called after successful payment redirect
 */
exports.verifyPaymentSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session ID is required' 
      });
    }

    console.log(`\n🔍 [VERIFY] Verifying payment session: ${sessionId}`);
    console.log(`   User ID: ${userId}`);

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    console.log(`   Payment Status: ${session.payment_status}`);
    console.log(`   Session Customer: ${session.customer}`);

    // Verify this session belongs to the authenticated user
    const sessionUserId = session.metadata?.userId;
    if (sessionUserId && sessionUserId !== userId.toString()) {
      console.error(`❌ [VERIFY] Session belongs to different user`);
      return res.status(403).json({ 
        success: false, 
        error: 'Session does not belong to authenticated user' 
      });
    }

    // Only process if payment was successful
    if (session.payment_status !== 'paid') {
      console.log(`⚠️  [VERIFY] Payment status is '${session.payment_status}', not 'paid'`);
      return res.json({ 
        success: false, 
        paid: false, 
        payment_status: session.payment_status 
      });
    }

    // Extract plan type
    const planType = session.metadata?.planType || 
                     session.subscription_details?.metadata?.planType;
    
    if (!planType || !['pro', 'business'].includes(planType.toLowerCase())) {
      console.error(`❌ [VERIFY] Invalid or missing plan type: ${planType}`);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan type in session' 
      });
    }

    const normalizedPlanType = planType.toLowerCase();

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ [VERIFY] User not found: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    console.log(`✅ [VERIFY] User found: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);

    // Check if already updated (idempotency)
    if (user.plan === normalizedPlanType && 
        user.role === normalizedPlanType &&
        user.stripeSubscriptionId === session.subscription &&
        user.planExpiresAt && 
        user.planExpiresAt > new Date()) {
      console.log(`ℹ️  [VERIFY] User already has ${normalizedPlanType} plan, no update needed`);
      return res.json({ 
        success: true, 
        paid: true, 
        already_updated: true,
        role: user.role || user.plan,
        plan: user.plan 
      });
    }

    // Get subscription details for accurate expiration
    let planExpiresAt;
    let subscriptionId = session.subscription;

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.current_period_end) {
          planExpiresAt = new Date(subscription.current_period_end * 1000);
          console.log(`✅ [VERIFY] Retrieved subscription expiration: ${planExpiresAt.toISOString()}`);
        }
      } catch (stripeError) {
        console.error(`❌ [VERIFY] Failed to retrieve subscription:`, stripeError.message);
        // Fallback to 1 month
        planExpiresAt = new Date();
        planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
      }
    } else {
      // Fallback to 1 month if no subscription
      planExpiresAt = new Date();
      planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);
    }

    // Update user role and plan atomically
    const updateData = {
      role: normalizedPlanType, // Update role
      plan: normalizedPlanType, // Update plan
      planStartedAt: new Date(),
      planExpiresAt: planExpiresAt,
    };
    
    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.error(`❌ [VERIFY] Failed to update user`);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update user plan' 
      });
    }

    console.log(`\n✅ [VERIFY] User role and plan successfully updated!`);
    console.log(`   User: ${updatedUser.email}`);
    console.log(`   Role: ${updatedUser.role} (was: ${user.role || 'free'})`);
    console.log(`   Plan: ${updatedUser.plan} (was: ${user.plan || 'free'})`);
    console.log(`   Subscription ID: ${updatedUser.stripeSubscriptionId || 'N/A'}`);
    console.log(`   Plan expires: ${updatedUser.planExpiresAt?.toISOString()}\n`);

    res.json({ 
      success: true, 
      paid: true, 
      updated: true,
      role: updatedUser.role || updatedUser.plan,
      plan: updatedUser.plan,
      planExpiresAt: updatedUser.planExpiresAt 
    });

  } catch (error) {
    console.error('❌ [VERIFY] Error verifying payment session:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to verify payment session' 
    });
  }
};

/**
 * Get current user's subscription status
 * GET /api/payment/status
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if plan is expired and update if necessary
    const now = new Date();
    if (user.planExpiresAt && user.planExpiresAt < now && user.plan !== 'free') {
      console.log(`⚠️  Plan expired for user ${user.email}, downgrading to free`);
      
      user.plan = 'free';
      user.planExpiresAt = null;
      await user.save();
      
      console.log(`✅ User ${user.email} downgraded to free plan due to expiration`);
    }

    res.json({
      success: true,
      plan: user.plan,
      planStartedAt: user.planStartedAt,
      planExpiresAt: user.planExpiresAt,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      hasActiveSubscription: user.plan !== 'free' && (!user.planExpiresAt || user.planExpiresAt > now),
    });

  } catch (error) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * Cancel user's subscription
 * POST /api/payment/cancel-subscription
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(userId);
    
    if (!user || !user.stripeSubscriptionId) {
      return res.status(404).json({ 
        success: false, 
        error: 'No active subscription found' 
      });
    }

    // Cancel subscription at period end (user keeps access until expiration)
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    console.log(`✅ Subscription cancelled for user ${user.email}`);

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      planExpiresAt: user.planExpiresAt,
    });

  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};
