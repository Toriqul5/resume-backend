const express = require('express');
const passport = require('passport');
const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://resume-craft-ai-ten.vercel.app';

// Start OAuth flow
router.get('/google', (req, res, next) => {
  // Prevent duplicate OAuth initiation within 2 seconds
  const now = Date.now();
  const lastInit = req.session.oauthInitTime || 0;
  const timeSinceLastInit = now - lastInit;
  
  if (timeSinceLastInit < 2000) {
    // If called within 2 seconds, ignore duplicate request
    // Passport is already handling the redirect on the first call
    return;
  }
  
  // Store initiation time
  req.session.oauthInitTime = now;
  
  console.log('🔐 OAuth: Initiating Google login...');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login`, session: true }),
  (req, res) => {
    // Successful authentication, redirect to dashboard
    console.log('✅ OAuth: Authentication successful, redirecting to dashboard');
    res.redirect(`${FRONTEND_URL}/dashboard`);
  }
);

// Logout
router.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid', { path: '/' });
      res.redirect(FRONTEND_URL);
    });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ user: null });
  }
  res.json({ user: req.user });
});

module.exports = router;
