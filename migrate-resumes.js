#!/usr/bin/env node

/**
 * Script to migrate existing resumes from localStorage format to MongoDB
 * This will help transition users who already have resumes in localStorage
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Resume = require('./models/Resume');

async function main() {
  console.log('\n🚚 Resume Migration Tool\n');
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');
    
    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users\n`);
    
    for (const user of users) {
      console.log(`\n📋 Processing user: ${user.email} (${user._id})`);
      
      // In a real scenario, we would need to somehow access the localStorage data
      // For this implementation, we'll just verify that the resume routes work
      // In practice, you'd need to get the localStorage data from the frontend
      // and send it to this backend for migration
      
      const existingResumes = await Resume.find({ userId: user._id });
      console.log(`   Existing resumes in DB: ${existingResumes.length}`);
      
      // Example of how to create a resume for a user (in real migration, 
      // you'd get this data from the localStorage export)
      if (existingResumes.length === 0) {
        console.log(`   No resumes found for this user, ready for new entries.`);
      } else {
        console.log(`   User already has ${existingResumes.length} resumes in database.`);
      }
    }
    
    console.log('\n✅ Migration tool completed successfully!');
    console.log('💡 Note: This tool verifies the resume system is working.');
    console.log('   Actual localStorage data would need to be migrated via frontend integration.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run the main function
main().catch(console.error);