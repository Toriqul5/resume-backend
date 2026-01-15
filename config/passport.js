const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

if (!process.env.BACKEND_URL) {
  throw new Error('BACKEND_URL environment variable is required');
}

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

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://resume-backend-phi.vercel.app/auth/google/callback",
      scope: ['profile', 'email'],
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
