#!/usr/bin/env node

/**
 * CLI Tool to debug webhook issues and verify user plan updates
 * Usage: node debug-webhook.js <userId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function main() {
  console.log('\n🔍 Webhook Debug Tool\n');
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node debug-webhook.js <userId>');
    console.log('   userId: The MongoDB user ID to debug');
    console.log('\nExample: node debug-webhook.js 1234567890abcdef');
    process.exit(1);
  }
  
  const userId = args[0];
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');
    
    // Find user
    console.log('🔍 Fetching user data...');
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`❌ User not found with ID: ${userId}`);
      process.exit(1);
    }
    
    console.log('📊 User Information:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Plan: ${user.plan || 'free'}`);
    console.log(`   Role: ${user.role || 'free'}`);
    console.log(`   Plan Started: ${user.planStartedAt ? user.planStartedAt.toISOString() : 'N/A'}`);
    console.log(`   Plan Expires: ${user.planExpiresAt ? user.planExpiresAt.toISOString() : 'N/A'}`);
    console.log(`   Stripe Customer ID: ${user.stripeCustomerId || 'N/A'}`);
    console.log(`   Stripe Subscription ID: ${user.stripeSubscriptionId || 'N/A'}`);
    console.log(`   Created: ${user.createdAt.toISOString()}`);
    console.log(`   Last Login: ${user.lastLogin.toISOString()}`);
    
    // Check if plan is expired
    const now = new Date();
    const isExpired = user.planExpiresAt && user.planExpiresAt < now && user.plan !== 'free';
    console.log(`\n📋 Plan Status:`);
    console.log(`   Is Expired: ${isExpired}`);
    console.log(`   Is Active: ${user.plan !== 'free' && (!user.planExpiresAt || user.planExpiresAt > now)}`);
    
    // Check webhook configuration
    console.log(`\n🔧 Webhook Configuration:`);
    console.log(`   Backend URL: ${process.env.BACKEND_URL || 'Not set'}`);
    console.log(`   Webhook Endpoint: ${process.env.BACKEND_URL || 'http://localhost:3006'}/api/payment/webhook`);
    console.log(`   Port: ${process.env.PORT || '3006'}`);
    console.log(`   Stripe Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET'}`);
    
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.log(`\n⚠️  WARNING: STRIPE_WEBHOOK_SECRET is not configured!`);
      console.log(`   Webhooks will not work without this secret.`);
      console.log(`   Set STRIPE_WEBHOOK_SECRET in your .env file.`);
    }
    
    if (!process.env.BACKEND_URL) {
      console.log(`\n⚠️  WARNING: BACKEND_URL is not configured!`);
      console.log(`   This may cause webhook issues.`);
      console.log(`   Set BACKEND_URL=http://localhost:3006 in your .env file.`);
    }
    
    // Provide debugging steps
    console.log(`\n🔧 Troubleshooting Steps:`);
    console.log(`   1. Verify STRIPE_WEBHOOK_SECRET is set in .env`);
    console.log(`   2. Check that webhook endpoint is registered in Stripe Dashboard`);
    console.log(`   3. Ensure BACKEND_URL matches your server URL`);
    console.log(`   4. Look for webhook logs in server console`);
    console.log(`   5. Use Stripe CLI to test webhooks locally: stripe listen`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run the main function
main().catch(console.error);