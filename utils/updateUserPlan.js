/**
 * Utility to manually update user plan in case of webhook failures
 * This is used when a payment was successful but the webhook didn't update the user's plan
 */

const User = require('../models/User');

/**
 * Manually update user's plan/role in database
 * @param {string} userId - User ID to update
 * @param {string} planType - Plan type: 'pro' or 'business'
 * @param {Object} options - Additional options
 * @param {Date} options.expirationDate - Custom expiration date (optional)
 * @param {string} options.subscriptionId - Stripe subscription ID (optional)
 * @returns {Promise<Object>} Updated user object
 */
async function updateUserPlan(userId, planType, options = {}) {
  try {
    console.log(`\n🔧 MANUAL PLAN UPDATE STARTED`);
    console.log(`   User ID: ${userId}`);
    console.log(`   New Plan: ${planType}`);
    console.log(`   Options:`, options);
    
    // Validate plan type
    const validPlans = ['pro', 'business', 'free'];
    if (!validPlans.includes(planType.toLowerCase())) {
      throw new Error(`Invalid plan type: ${planType}. Must be one of: ${validPlans.join(', ')}`);
    }
    
    const normalizedPlanType = planType.toLowerCase();
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    console.log(`✅ User found: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);
    console.log(`   Current role: ${user.role || 'free'}`);
    
    // Prepare update data
    const updateData = {
      role: normalizedPlanType,
      plan: normalizedPlanType,
      planStartedAt: new Date(),
    };
    
    // Set expiration date
    if (options.expirationDate) {
      updateData.planExpiresAt = new Date(options.expirationDate);
    } else {
      // Default to 1 month from now
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      updateData.planExpiresAt = expiryDate;
    }
    
    // Add subscription ID if provided
    if (options.subscriptionId) {
      updateData.stripeSubscriptionId = options.subscriptionId;
    }
    
    // Perform the update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      throw new Error(`Failed to update user: ${userId}`);
    }
    
    console.log(`\n✅ MANUAL PLAN UPDATE SUCCESSFUL!`);
    console.log(`   User: ${updatedUser.email}`);
    console.log(`   New Plan: ${updatedUser.plan}`);
    console.log(`   New Role: ${updatedUser.role}`);
    console.log(`   Plan Started: ${updatedUser.planStartedAt.toISOString()}`);
    console.log(`   Plan Expires: ${updatedUser.planExpiresAt.toISOString()}`);
    console.log(`   Subscription ID: ${updatedUser.stripeSubscriptionId || 'N/A'}`);
    console.log(`   ✅ User plan and role updated in database`);
    
    return updatedUser;
    
  } catch (error) {
    console.error(`\n❌ MANUAL PLAN UPDATE FAILED:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Downgrade user to free plan
 * @param {string} userId - User ID to update
 * @returns {Promise<Object>} Updated user object
 */
async function downgradeToFree(userId) {
  try {
    console.log(`\n🔄 DOWNGRADE TO FREE STARTED`);
    console.log(`   User ID: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    console.log(`✅ User found: ${user.email}`);
    console.log(`   Current plan: ${user.plan || 'free'}`);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          role: 'free',
          plan: 'free',
          planExpiresAt: null,
          stripeSubscriptionId: null
        } 
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      throw new Error(`Failed to downgrade user: ${userId}`);
    }
    
    console.log(`\n✅ DOWNGRADE TO FREE SUCCESSFUL!`);
    console.log(`   User: ${updatedUser.email}`);
    console.log(`   New Plan: ${updatedUser.plan}`);
    console.log(`   New Role: ${updatedUser.role}`);
    console.log(`   ✅ User downgraded to free plan`);
    
    return updatedUser;
    
  } catch (error) {
    console.error(`\n❌ DOWNGRADE TO FREE FAILED:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Verify user's current plan status
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} User plan information
 */
async function verifyUserPlan(userId) {
  try {
    console.log(`\n🔍 VERIFY USER PLAN STARTED`);
    console.log(`   User ID: ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    console.log(`✅ User found: ${user.email}`);
    console.log(`   Plan: ${user.plan || 'free'}`);
    console.log(`   Role: ${user.role || 'free'}`);
    console.log(`   Plan Started: ${user.planStartedAt ? user.planStartedAt.toISOString() : 'N/A'}`);
    console.log(`   Plan Expires: ${user.planExpiresAt ? user.planExpiresAt.toISOString() : 'N/A'}`);
    console.log(`   Subscription ID: ${user.stripeSubscriptionId || 'N/A'}`);
    
    // Check if plan is expired
    const now = new Date();
    const isExpired = user.planExpiresAt && user.planExpiresAt < now && user.plan !== 'free';
    console.log(`   Is Expired: ${isExpired}`);
    
    return {
      userId: user._id,
      email: user.email,
      plan: user.plan || 'free',
      role: user.role || 'free',
      planStartedAt: user.planStartedAt,
      planExpiresAt: user.planExpiresAt,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      isExpired,
      isActive: user.plan !== 'free' && (!user.planExpiresAt || user.planExpiresAt > now)
    };
    
  } catch (error) {
    console.error(`\n❌ VERIFY USER PLAN FAILED:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    throw error;
  }
}

module.exports = {
  updateUserPlan,
  downgradeToFree,
  verifyUserPlan
};