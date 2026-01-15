/**
 * Auto-update BACKEND_URL in .env file when server port changes
 * 
 * This utility ensures the .env file always reflects the actual running port,
 * preventing mismatches that cause OAuth, CORS, and API routing issues.
 */

const fs = require('fs');
const path = require('path');

/**
 * Updates the BACKEND_URL in .env file to match the current server port
 * 
 * @param {number} currentPort - The port the server is actually running on
 * @param {string} envFilePath - Optional path to .env file (defaults to backend/.env)
 * @returns {Object} - { updated: boolean, oldUrl: string, newUrl: string }
 */
function updateBackendUrl(currentPort, envFilePath = null) {
  // Default to .env in the same directory as this script's parent
  if (!envFilePath) {
    envFilePath = path.join(__dirname, '..', '.env');
  }

  // Validate port
  if (!currentPort || typeof currentPort !== 'number') {
    console.error('❌ Invalid port provided to updateBackendUrl:', currentPort);
    return { updated: false, error: 'Invalid port' };
  }

  // Check if .env file exists
  if (!fs.existsSync(envFilePath)) {
    console.error('❌ .env file not found at:', envFilePath);
    return { updated: false, error: '.env file not found' };
  }

  try {
    // Read current .env file content
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Build the new BACKEND_URL
    const newBackendUrl = `http://localhost:${currentPort}`;
    
    // Check if BACKEND_URL exists in the file
    const backendUrlRegex = /^BACKEND_URL=.*$/m;
    const match = envContent.match(backendUrlRegex);
    
    if (match) {
      // Extract old URL for logging
      const oldLine = match[0];
      const oldUrl = oldLine.split('=')[1];
      
      // Check if update is needed
      if (oldUrl === newBackendUrl) {
        console.log(`✅ BACKEND_URL already correct: ${newBackendUrl}`);
        return { updated: false, oldUrl, newUrl: newBackendUrl, message: 'Already up to date' };
      }
      
      // Replace existing BACKEND_URL
      envContent = envContent.replace(backendUrlRegex, `BACKEND_URL=${newBackendUrl}`);
      
      // Write back to file
      fs.writeFileSync(envFilePath, envContent, 'utf8');
      
      console.log(`✅ Updated BACKEND_URL in .env:`);
      console.log(`   Old: ${oldUrl}`);
      console.log(`   New: ${newBackendUrl}`);
      
      return { updated: true, oldUrl, newUrl: newBackendUrl };
      
    } else {
      // BACKEND_URL doesn't exist, append it
      // Find a good place to add it (after PORT or FRONTEND_URL if they exist)
      const lines = envContent.split('\n');
      let insertIndex = -1;
      
      // Try to insert after PORT or FRONTEND_URL
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('PORT=') || lines[i].startsWith('FRONTEND_URL=')) {
          insertIndex = i + 1;
        }
      }
      
      // If not found, append to end
      if (insertIndex === -1) {
        insertIndex = lines.length;
      }
      
      // Insert the new BACKEND_URL
      lines.splice(insertIndex, 0, `BACKEND_URL=${newBackendUrl}`);
      envContent = lines.join('\n');
      
      // Write back to file
      fs.writeFileSync(envFilePath, envContent, 'utf8');
      
      console.log(`✅ Added BACKEND_URL to .env: ${newBackendUrl}`);
      
      return { updated: true, oldUrl: null, newUrl: newBackendUrl };
    }
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return { updated: false, error: error.message };
  }
}

/**
 * Updates GOOGLE_REDIRECT_URI to match the current port
 * 
 * @param {number} currentPort - The port the server is actually running on
 * @param {string} envFilePath - Optional path to .env file
 * @returns {Object} - { updated: boolean, oldUrl: string, newUrl: string }
 */
function updateGoogleRedirectUri(currentPort, envFilePath = null) {
  if (!envFilePath) {
    envFilePath = path.join(__dirname, '..', '.env');
  }

  if (!currentPort || typeof currentPort !== 'number') {
    return { updated: false, error: 'Invalid port' };
  }

  if (!fs.existsSync(envFilePath)) {
    return { updated: false, error: '.env file not found' };
  }

  try {
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    const newRedirectUri = `http://localhost:${currentPort}/auth/google/callback`;
    
    const redirectUriRegex = /^GOOGLE_REDIRECT_URI=.*$/m;
    const match = envContent.match(redirectUriRegex);
    
    if (match) {
      const oldLine = match[0];
      const oldUri = oldLine.split('=')[1];
      
      if (oldUri === newRedirectUri) {
        return { updated: false, oldUri, newUri: newRedirectUri, message: 'Already up to date' };
      }
      
      envContent = envContent.replace(redirectUriRegex, `GOOGLE_REDIRECT_URI=${newRedirectUri}`);
      fs.writeFileSync(envFilePath, envContent, 'utf8');
      
      console.log(`✅ Updated GOOGLE_REDIRECT_URI in .env:`);
      console.log(`   Old: ${oldUri}`);
      console.log(`   New: ${newRedirectUri}`);
      
      return { updated: true, oldUri, newUri: newRedirectUri };
    }
    
    return { updated: false, message: 'GOOGLE_REDIRECT_URI not found in .env' };
    
  } catch (error) {
    console.error('❌ Error updating GOOGLE_REDIRECT_URI:', error.message);
    return { updated: false, error: error.message };
  }
}

/**
 * Updates both BACKEND_URL and GOOGLE_REDIRECT_URI
 * Call this when the server starts on a specific port
 * 
 * @param {number} currentPort - The port the server is running on
 */
function syncEnvWithPort(currentPort) {
  console.log(`\n🔄 Syncing .env file with server port ${currentPort}...`);
  
  const backendResult = updateBackendUrl(currentPort);
  const redirectResult = updateGoogleRedirectUri(currentPort);
  
  if (backendResult.updated || redirectResult.updated) {
    console.log(`✅ .env file synchronized with port ${currentPort}\n`);
  } else {
    console.log(`✅ .env file already in sync with port ${currentPort}\n`);
  }
  
  return {
    backend: backendResult,
    redirect: redirectResult
  };
}

module.exports = {
  updateBackendUrl,
  updateGoogleRedirectUri,
  syncEnvWithPort
};
