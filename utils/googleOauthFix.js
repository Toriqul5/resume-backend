/**
 * Google OAuth Redirect URI Fix Utility
 * 
 * This utility automatically detects and fixes common redirect URI mismatches
 * between the application and Google Cloud Console configuration.
 */

const fs = require('fs');
const path = require('path');

/**
 * Gets the current redirect URI based on server configuration
 * @param {number} port - The port the server is running on
 * @returns {string} The correct redirect URI
 */
function getCurrentRedirectUri(port) {
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL}/auth/google/callback`;
  }
  if (!port || typeof port !== 'number') {
    throw new Error('Invalid port provided');
  }
  return `http://localhost:${port}/auth/google/callback`;
}

/**
 * Gets the current BACKEND_URL based on port
 * @param {number} port - The port the server is running on
 * @returns {string} The correct BACKEND_URL
 */
function getCurrentBackendUrl(port) {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  if (!port || typeof port !== 'number') {
    throw new Error('Invalid port provided');
  }
  return `http://localhost:${port}`;
}

/**
 * Checks if the redirect URI in .env matches the expected one based on port
 * @param {number} currentPort - The port the server is running on
 * @param {string} envFilePath - Path to .env file
 * @returns {Object} Result with status and fixes applied
 */
function checkAndFixRedirectUri(currentPort, envFilePath = null) {
  if (!envFilePath) {
    envFilePath = path.join(__dirname, '..', '.env');
  }

  if (!fs.existsSync(envFilePath)) {
    console.error('❌ .env file not found at:', envFilePath);
    return { success: false, error: '.env file not found' };
  }

  let envContent = fs.readFileSync(envFilePath, 'utf8');
  
  const expectedRedirectUri = getCurrentRedirectUri(currentPort);
  const expectedBackendUrl = getCurrentBackendUrl(currentPort);
  
  // Check GOOGLE_REDIRECT_URI
  const redirectUriRegex = /^GOOGLE_REDIRECT_URI=.*$/m;
  const redirectUriMatch = envContent.match(redirectUriRegex);
  
  let redirectUriFixed = false;
  if (redirectUriMatch) {
    const currentRedirectUri = redirectUriMatch[0].split('=')[1];
    if (currentRedirectUri !== expectedRedirectUri) {
      console.log(`🔄 Fixing GOOGLE_REDIRECT_URI...`);
      console.log(`   Old: ${currentRedirectUri}`);
      console.log(`   New: ${expectedRedirectUri}`);
      envContent = envContent.replace(redirectUriRegex, `GOOGLE_REDIRECT_URI=${expectedRedirectUri}`);
      redirectUriFixed = true;
    }
  } else {
    // Add GOOGLE_REDIRECT_URI if it doesn't exist
    const lines = envContent.split('\n');
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('GOOGLE_CLIENT_ID=') || lines[i].startsWith('GOOGLE_CLIENT_SECRET=')) {
        insertIndex = i + 1;
        break;
      }
    }
    if (insertIndex === -1) {
      insertIndex = lines.length;
    }
    lines.splice(insertIndex, 0, `GOOGLE_REDIRECT_URI=${expectedRedirectUri}`);
    envContent = lines.join('\n');
    redirectUriFixed = true;
    console.log(`➕ Added GOOGLE_REDIRECT_URI: ${expectedRedirectUri}`);
  }
  
  // Check BACKEND_URL
  const backendUrlRegex = /^BACKEND_URL=.*$/m;
  const backendUrlMatch = envContent.match(backendUrlRegex);
  
  let backendUrlFixed = false;
  if (backendUrlMatch) {
    const currentBackendUrl = backendUrlMatch[0].split('=')[1];
    if (currentBackendUrl !== expectedBackendUrl) {
      console.log(`🔄 Fixing BACKEND_URL...`);
      console.log(`   Old: ${currentBackendUrl}`);
      console.log(`   New: ${expectedBackendUrl}`);
      envContent = envContent.replace(backendUrlRegex, `BACKEND_URL=${expectedBackendUrl}`);
      backendUrlFixed = true;
    }
  } else {
    // Add BACKEND_URL if it doesn't exist
    const lines = envContent.split('\n');
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('FRONTEND_URL=')) {
        insertIndex = i;
        break;
      }
    }
    if (insertIndex === -1) {
      insertIndex = lines.length;
    }
    lines.splice(insertIndex, 0, `BACKEND_URL=${expectedBackendUrl}`);
    envContent = lines.join('\n');
    backendUrlFixed = true;
    console.log(`➕ Added BACKEND_URL: ${expectedBackendUrl}`);
  }
  
  // Write back to file if changes were made
  if (redirectUriFixed || backendUrlFixed) {
    fs.writeFileSync(envFilePath, envContent, 'utf8');
    console.log(`✅ .env file updated successfully`);
  } else {
    console.log(`✅ No changes needed in .env file`);
  }
  
  return {
    success: true,
    redirectUriFixed,
    backendUrlFixed,
    expectedRedirectUri,
    expectedBackendUrl
  };
}

/**
 * Generates Google Cloud Console instructions
 * @param {string} redirectUri - The redirect URI to register
 * @returns {string} Instructions for Google Cloud Console
 */
function getGoogleCloudConsoleInstructions(redirectUri) {
  return `
🔧 GOOGLE CLOUD CONSOLE INSTRUCTIONS:
=====================================

To complete the OAuth setup, you need to add this redirect URI to your Google Cloud Console:

Redirect URI to add: ${redirectUri}

Steps:
1. Go to https://console.cloud.google.com/
2. Navigate to APIs & Credentials → OAuth 2.0 Client IDs
3. Click on your OAuth client
4. In "Authorized redirect URIs", add:
   ${redirectUri}
5. Click "Save"

💡 TIP: You can add multiple redirect URIs for different ports during development:
   - http://localhost:3006/auth/google/callback
   - http://localhost:3002/auth/google/callback
   - http://localhost:3003/auth/google/callback
   - http://localhost:3004/auth/google/callback
   - http://localhost:3005/auth/google/callback
   etc.
   
✅ Once you add the redirect URI in Google Cloud Console, OAuth will work properly.
`;
}

/**
 * Complete automatic fix for Google OAuth redirect URI mismatch
 * @param {number} currentPort - The port the server is running on
 * @param {string} envFilePath - Path to .env file
 */
function autoFixGoogleOAuth(currentPort, envFilePath = null) {
  console.log(`\n🔧 AUTOMATIC GOOGLE OAUTH FIX`);
  console.log(`===============================`);
  
  // Fix local configuration
  const result = checkAndFixRedirectUri(currentPort, envFilePath);
  
  if (!result.success) {
    console.error('❌ Failed to fix local configuration');
    return result;
  }
  
  // Generate Google Cloud Console instructions
  const instructions = getGoogleCloudConsoleInstructions(result.expectedRedirectUri);
  console.log(instructions);
  
  return {
    ...result,
    googleConsoleInstructions: instructions
  };
}

module.exports = {
  getCurrentRedirectUri,
  getCurrentBackendUrl,
  checkAndFixRedirectUri,
  getGoogleCloudConsoleInstructions,
  autoFixGoogleOAuth
};