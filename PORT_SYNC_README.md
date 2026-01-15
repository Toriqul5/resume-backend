# Auto-Sync .env Port Utility

This solution automatically keeps your `BACKEND_URL` and `GOOGLE_REDIRECT_URI` in sync with your server's running port, eliminating the need to manually update your `.env` file when ports change.

## Files Included

### 1. `utils/updateEnvPort.js`
Main utility module with functions to:
- `updateBackendUrl(port)` - Updates BACKEND_URL in .env
- `updateGoogleRedirectUri(port)` - Updates GOOGLE_REDIRECT_URI in .env  
- `syncEnvWithPort(port)` - Updates both variables at once

### 2. `sync-env-port.js`
Standalone script to manually sync the .env file:
```bash
node sync-env-port.js 3005
```

### 3. Integrated Server Logic
The `server.js` file automatically syncs the .env file every time the server starts on a specific port.

## How It Works

1. **Automatic Sync**: When the server starts, it automatically updates the .env file to match the running port
2. **Manual Sync**: Use the standalone script to manually sync when needed
3. **Idempotent**: Safe to run multiple times - only updates if values differ
4. **Safe**: Validates ports and handles errors gracefully

## Usage Scenarios

### Scenario 1: Server starts on new port
- Server automatically detects port (e.g., 3005)
- Updates .env file to match: `BACKEND_URL=http://localhost:3005`
- No manual intervention needed

### Scenario 2: Manual port change
```bash
# Change port manually
node sync-env-port.js 3006
```

### Scenario 3: Port fallback
- If primary port (3004) is busy
- Server falls back to next available port (3005, 3006, etc.)
- Automatically updates .env to match fallback port

## Benefits

✅ **No more manual .env updates**  
✅ **Prevents OAuth/CORS issues**  
✅ **Safe and idempotent**  
✅ **Error handling built-in**  
✅ **Works with port fallback**  
✅ **Preserves other .env variables**  

## Example Output

When the server starts:
```
🔄 Syncing .env file with server port 3004...
✅ BACKEND_URL already correct: http://localhost:3004
✅ .env file already in sync with port 3004
```

When updating manually:
```
🔧 Manual .env Port Sync Tool
===============================

🔄 Syncing .env file with server port 3005...
✅ Updated BACKEND_URL in .env:
   Old: http://localhost:3004
   New: http://localhost:3005
✅ Updated GOOGLE_REDIRECT_URI in .env:
   Old: http://localhost:3004/auth/google/callback
   New: http://localhost:3005/auth/google/callback
✅ .env file synchronized with port 3005

📋 Results:
  BACKEND_URL: ✅ Updated
  GOOGLE_REDIRECT_URI: ✅ Updated

✅ Success! Your .env file is now in sync with port 3005
```

Now you'll never have to manually edit your .env file again when changing ports!