#!/usr/bin/env node

/**
 * Standalone Google OAuth Redirect URI Fix Script
 * 
 * This script automatically detects and fixes Google OAuth redirect URI mismatches
 * by updating your local configuration and providing instructions for Google Cloud Console.
 * 
 * Usage:
 *   node google-oauth-fix.js <port>
 * 
 * Example:
 *   node google-oauth-fix.js 3005
 */

const { autoFixGoogleOAuth } = require('./utils/googleOauthFix');

// Get port from command line argument
const port = parseInt(process.argv[2]);

if (!port || isNaN(port)) {
  console.error('❌ Error: Please provide a valid port number');
  console.log('\nUsage:');
  console.log('  node google-oauth-fix.js <port>');
  console.log('\nExample:');
  console.log('  node google-oauth-fix.js 3005');
  process.exit(1);
}

// Validate port range
if (port < 1 || port > 65535) {
  console.error(`❌ Error: Port ${port} is out of valid range (1-65535)`);
  process.exit(1);
}

console.log(`\n🔧 STANDALONE GOOGLE OAUTH FIX`);
console.log(`===============================\n`);

// Run the automatic fix
const result = autoFixGoogleOAuth(port);

console.log(`\n📋 RESULTS:`);
console.log(`  Local configuration: ${result.success ? '✅ Fixed' : '❌ Error'}`);
console.log(`  Redirect URI fixed: ${result.redirectUriFixed ? '✅ Yes' : '⏭️  No'}`);
console.log(`  Backend URL fixed: ${result.backendUrlFixed ? '✅ Yes' : '⏭️  No'}`);

if (result.success) {
  console.log(`\n✅ Google OAuth configuration updated for port ${port}!`);
  console.log(`\n💡 Remember to add the redirect URI to Google Cloud Console as shown above.`);
} else {
  console.log(`\n❌ Failed to update Google OAuth configuration`);
}
