#!/usr/bin/env node

/**
 * CLI Tool to manually update user plan
 * Usage: node update-user-plan.js <userId> <planType> [subscriptionId]
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the utility function
const { updateUserPlan, verifyUserPlan, downgradeToFree } = require('./utils/updateUserPlan');

async function main() {
  console.log('\n🔧 Manual User Plan Update Tool\n');
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node update-user-plan.js <userId> <planType> [subscriptionId]');
    console.log('   userId: The MongoDB user ID');
    console.log('   planType: "pro" or "business" or "free"');
    console.log('   subscriptionId: Optional Stripe subscription ID');
    console.log('\nExample: node update-user-plan.js 1234567890abcdef pro');
    console.log('Example: node update-user-plan.js 1234567890abcdef business sub_1234567890');
    console.log('Example: node update-user-plan.js 1234567890abcdef free  # Downgrade to free');
    process.exit(1);
  }
  
  const [userId, planType, subscriptionId] = args;
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');
    
    // Check if downgrading to free
    if (planType.toLowerCase() === 'free') {
      console.log('🔄 Downgrading user to free plan...');
      await downgradeToFree(userId);
    } else {
      // Validate plan type
      const validPlans = ['pro', 'business'];
      if (!validPlans.includes(planType.toLowerCase())) {
        throw new Error(`Invalid plan type: ${planType}. Must be one of: ${validPlans.join(', ')}`);
      }
      
      console.log('🔄 Updating user plan...');
      const options = {};
      if (subscriptionId) {
        options.subscriptionId = subscriptionId;
      }
      
      await updateUserPlan(userId, planType, options);
    }
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const userData = await verifyUserPlan(userId);
    
    console.log('\n✅ Plan update completed successfully!');
    console.log('📊 Updated User Information:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Plan: ${userData.plan}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Plan Started: ${userData.planStartedAt ? userData.planStartedAt.toISOString() : 'N/A'}`);
    console.log(`   Plan Expires: ${userData.planExpiresAt ? userData.planExpiresAt.toISOString() : 'N/A'}`);
    console.log(`   Subscription ID: ${userData.stripeSubscriptionId || 'N/A'}`);
    console.log(`   Is Active: ${userData.isActive}`);
    
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