#!/usr/bin/env node

/**
 * Standalone script to manually sync .env with current server port
 * 
 * Usage:
 *   node sync-env-port.js <port>
 * 
 * Example:
 *   node sync-env-port.js 3003
 * 
 * This script updates BACKEND_URL and GOOGLE_REDIRECT_URI in the .env file
 * to match the specified port.
 */

const { syncEnvWithPort } = require('./utils/updateEnvPort');

// Get port from command line argument
const port = parseInt(process.argv[2]);

if (!port || isNaN(port)) {
  console.error('❌ Error: Please provide a valid port number');
  console.log('\nUsage:');
  console.log('  node sync-env-port.js <port>');
  console.log('\nExample:');
  console.log('  node sync-env-port.js 3003');
  process.exit(1);
}

// Validate port range
if (port < 1 || port > 65535) {
  console.error(`❌ Error: Port ${port} is out of valid range (1-65535)`);
  process.exit(1);
}

console.log(`\n🔧 Manual .env Port Sync Tool`);
console.log(`===============================\n`);

// Sync the .env file
const result = syncEnvWithPort(port);

// Show detailed results
console.log(`\n📋 Results:`);
console.log(`  BACKEND_URL: ${result.backend.updated ? '✅ Updated' : '⏭️  No change needed'}`);
console.log(`  GOOGLE_REDIRECT_URI: ${result.redirect.updated ? '✅ Updated' : '⏭️  No change needed'}`);

if (result.backend.updated || result.redirect.updated) {
  console.log(`\n✅ Success! Your .env file is now in sync with port ${port}`);
  console.log(`\n💡 Tip: Restart your server to apply the changes\n`);
} else {
  console.log(`\n✅ .env file was already in sync with port ${port}\n`);
}
