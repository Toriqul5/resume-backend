# Backend: Resume Builder (Google OAuth + MongoDB)

This backend implements Google OAuth using Passport, session management with `express-session` + `connect-mongo`, and a `User` model in MongoDB that stores signup date and last login.

## Files added
- `server.js` - entry point
- `app.js` - Express app, CORS, sessions, Passport init
- `config/db.js` - MongoDB connection
- `config/passport.js` - Passport Google strategy (create/update user)
- `models/User.js` - Mongoose user schema
- `routes/auth.routes.js` - `/auth` endpoints
- `controllers/auth.controller.js` - small controller helpers
- `middlewares/auth.middleware.js` - `ensureAuth` helper
- `.env.example` - example env

## Environment variables
Create a `backend/.env` file (do NOT commit secrets).

Example `.env`:

```env
PORT=3006
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3006
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=replace_with_a_long_random_string
NODE_ENV=development
```

Notes:
- `FRONTEND_URL` is used to redirect users back to the frontend after login (e.g. `http://localhost:8080`).
- `BACKEND_URL` should match the host where this server runs (used as fallback callback URL).

## Install and run

```bash
cd backend
npm install
# development
npm run dev
# production
npm start
```

`npm run dev` uses `nodemon` (watch + restart).

## Google OAuth setup (summary)
1. Open Google Cloud Console → APIs & Services → OAuth consent screen.
2. Create/select a project and configure consent screen (app name, email, test users if needed).
3. Create Credentials → OAuth Client ID → Web application.
4. Add Authorized redirect URI(s):
   - `http://localhost:3006/auth/google/callback` (local backend callback)
   - Add production callback when deploying (e.g. `https://yourdomain.com/auth/google/callback`).
5. Save the `Client ID` and `Client Secret` into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Frontend integration
- Ensure `frontend/.env` sets the backend base URL:

```env
VITE_API_BASE_URL=http://localhost:3006
VITE_DEFAULT_AUTH_REDIRECT=/dashboard
```

- Add a sign-in button that redirects users to `${VITE_API_BASE_URL}/auth/google` (the repository includes `frontend/src/components/GoogleSignIn.tsx`).
- Protected routes should call `${VITE_API_BASE_URL}/auth/me` with `credentials: 'include'` to check session.

## Endpoints
- `GET /auth/google` — start Google OAuth
- `GET /auth/google/callback` — OAuth callback (redirects to `FRONTEND_URL` on success)
- `GET /auth/logout` — logs out and redirects to `FRONTEND_URL`
- `GET /auth/me` — returns currently authenticated user JSON or 401

## Database
- The `User` model stores `googleId`, `name`, `email`, `avatar`, `provider`, `createdAt`, `lastLogin`.
- On first login we create a `User` and set `createdAt`/`lastLogin`. On returning logins we update `lastLogin`.

## Troubleshooting
- Redirect URI mismatch → ensure callback URI in Google Console matches backend callback
- Session cookie issues → ensure `FRONTEND_URL` matches frontend origin and use `credentials: 'include'` on fetch
- CORS errors → confirm backend `FRONTEND_URL` set and CORS configured to allow credentials

## Next steps
- Add logout link on frontend to call `${VITE_API_BASE_URL}/auth/logout` (this repo already adds a `Logout` control to the Navbar).
- Consider HTTPS and `cookie.secure=true` in production.

