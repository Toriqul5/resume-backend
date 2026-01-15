const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Get callback URL from BACKEND_URL environment variable
// This ensures consistency with the actual server port
const getCallbackURL = () => {
  const backendUrl = process.env.BACKEND_URL;
  
  if (!backendUrl) {
    // Fallback: construct from PORT if BACKEND_URL not set
    const port = process.env.PORT || '3006';
    const fallbackUrl = `http://localhost:${port}`;
    console.warn(`⚠️  BACKEND_URL not set, using fallback: ${fallbackUrl}`);
    return `${fallbackUrl}/auth/google/callback`;
  }
  
  // Use BACKEND_URL directly, ensuring no trailing slash
  return `${backendUrl.replace(/\/$/, '')}/auth/google/callback`;
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Use BACKEND_URL directly for the callback, as required:
      // http://localhost:3006/auth/google/callback
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails && profile.emails[0] && profile.emails[0].value;
        const avatar = profile.photos && profile.photos[0] && profile.photos[0].value;

        console.log(`🔐 OAuth: Processing login for ${email || name}`);

        let user = await User.findOne({ googleId });
        if (!user) {
          // create new user on first login
          user = await User.create({
            googleId,
            name,
            email,
            avatar,
            provider: 'google',
            createdAt: new Date(),
            lastLogin: new Date(),
          });
          console.log(`✅ New user created: ${email || name}`);
        } else {
          // update last login
          user.lastLogin = new Date();
          await user.save();
          console.log(`✅ User logged in: ${email || name}`);
        }

        return done(null, user);
      } catch (err) {
        console.error('❌ OAuth error:', err);
        return done(err);
      }
    }
  )
);

module.exports = passport;
