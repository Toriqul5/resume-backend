# Server Fix Guide - EACCES Error Resolution

## ✅ What Was Fixed

The server has been updated to automatically handle port permission issues and provide better error messages.

### Changes Made:

1. **Automatic Port Fallback**
   - Server now tries port 5000 first
   - If port 5000 fails (EACCES or EADDRINUSE), automatically tries: 5001, 5002, 3001, 3002
   - No manual intervention needed

2. **Better Host Configuration**
   - Changed from `127.0.0.1` to `0.0.0.0` for better compatibility
   - Allows connections from all network interfaces

3. **Environment Variable Validation**
   - Server validates all required environment variables before starting
   - Clear error messages if variables are missing

4. **Non-Blocking MongoDB Connection**
   - Server starts even if MongoDB connection fails
   - Allows you to test OAuth without database initially

5. **Enhanced Logging**
   - Clear success/error messages
   - OAuth flow logging for debugging
   - Port information displayed on startup

---

## 🚀 How to Start the Server

### Step 1: Ensure .env File Exists

Create `backend/.env` with:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/resume-builder
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:5000
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=your-random-secret-here
NODE_ENV=development
```

### Step 2: Start the Server

```bash
cd backend
npm run dev
```

### Step 3: Check the Output

**Success looks like:**
```
✅ Environment variables validated
✅ MongoDB connected successfully

🚀 Backend server started successfully!
📍 Server running on http://localhost:5000
🌐 Accessible at http://0.0.0.0:5000
🔐 Google OAuth: http://localhost:5000/auth/google
📊 Health check: http://localhost:5000/
```

**If port 5000 fails, you'll see:**
```
❌ Permission denied on port 5000
🔄 Trying fallback port 5001...
🚀 Backend server started successfully!
📍 Server running on http://localhost:5001
```

---

## 🔧 What Caused the EACCES Error?

**EACCES (Permission Denied)** can occur when:

1. **Port requires elevated privileges** - Some systems restrict ports below 1024
2. **Firewall/Antivirus blocking** - Security software blocking the port
3. **Port already in use** - Another application using port 5000
4. **Windows reserved ports** - Windows may reserve certain port ranges

**Solution:** The server now automatically tries alternative ports (5001, 5002, etc.) which typically don't have permission issues.

---

## 🧪 Testing the Server

### Test 1: Health Check

```bash
curl http://localhost:5000/
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Resume Builder Backend API",
  "endpoints": {
    "health": "/",
    "googleAuth": "/auth/google",
    "callback": "/auth/google/callback",
    "logout": "/auth/logout",
    "currentUser": "/auth/me"
  }
}
```

### Test 2: Google OAuth Endpoint

Open in browser: `http://localhost:5000/auth/google`

**Expected:** Redirects to Google login page

**If you see an error:**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Verify redirect URI in Google Console matches: `http://localhost:5000/auth/google/callback`
- (If server is on different port, update redirect URI accordingly)

### Test 3: Check Server Logs

When you visit `/auth/google`, you should see:
```
🔐 OAuth: Initiating Google login...
```

---

## 📝 Important Notes

### Port Configuration

- **If server starts on port 5001** (or other fallback port):
  1. Update `BACKEND_URL` in `.env` to match: `BACKEND_URL=http://localhost:5001`
  2. Update redirect URI in Google Console to: `http://localhost:5001/auth/google/callback`
  3. Update `VITE_API_BASE_URL` in frontend `.env` to: `VITE_API_BASE_URL=http://localhost:5001`

### MongoDB Connection

- Server will start even if MongoDB is not available
- OAuth will work, but user data won't be saved
- Fix MongoDB connection to enable full functionality

### Environment Variables

Required variables (server validates these):
- ✅ `MONGO_URI`
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `SESSION_SECRET`

Optional variables:
- `PORT` (defaults to 5000)
- `HOST` (defaults to 0.0.0.0)
- `FRONTEND_URL` (defaults to http://localhost:8080)
- `BACKEND_URL` (defaults to http://localhost:5000)

---

## 🐛 Troubleshooting

### Issue: Server still fails to start

**Check:**
1. Is `.env` file in `backend/` folder?
2. Are all required environment variables set?
3. Check terminal output for specific error messages

### Issue: OAuth redirect doesn't work

**Check:**
1. What port is the server actually running on? (check startup logs)
2. Does redirect URI in Google Console match the actual port?
3. Is `BACKEND_URL` in `.env` correct?

### Issue: MongoDB connection fails

**Check:**
1. Is MongoDB running? (for local MongoDB)
2. Is `MONGO_URI` correct?
3. For MongoDB Atlas: Check IP whitelist and credentials

**Note:** Server will start without MongoDB, but OAuth won't save user data.

---

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] No EACCES or permission errors
- [ ] Health check endpoint works (`http://localhost:PORT/`)
- [ ] Google OAuth endpoint accessible (`http://localhost:PORT/auth/google`)
- [ ] Redirects to Google login page
- [ ] MongoDB connected (if configured)
- [ ] All environment variables validated

---

## 🎯 Next Steps

1. **Test OAuth Flow:**
   - Visit `http://localhost:PORT/auth/google`
   - Complete Google login
   - Should redirect to dashboard

2. **Update Frontend:**
   - Ensure `VITE_API_BASE_URL` matches actual server port
   - Test login from frontend

3. **Verify Database:**
   - Check MongoDB for user data after login
   - Verify `createdAt` and `lastLogin` are set

---

**The server is now configured to automatically handle port issues. Just start it and it will find an available port!** 🚀

