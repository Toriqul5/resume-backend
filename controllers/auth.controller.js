// Currently the passport verify callback performs user creation/update.
// Exported controller placeholders in case you want to expand logic later.

const User = require('../models/User');

exports.logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('connect.sid', { path: '/' });
      res.redirect(process.env.FRONTEND_URL || 'https://resume-craft-ai-ten.vercel.app');
    });
  });
};

exports.me = async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ user: null });
  }
  
  try {
    // Always fetch fresh user data from database to ensure plan is up-to-date
    // This is critical after payment webhooks update the user's plan
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ user: null });
    }
    
    // Check if user's plan has expired and update if necessary
    const now = new Date();
    if (user.planExpiresAt && user.planExpiresAt < now && user.plan !== 'free') {
      console.log(`⚠️  Plan expired for user ${user.email}, downgrading to free`);
      
      // Update user's role and plan to free in the database
      user.role = 'free';
      user.plan = 'free';
      user.planExpiresAt = null;
      await user.save();
      
      console.log(`✅ User ${user.email} downgraded to free plan due to expiration`);
    }
    
    // Ensure role and plan are in sync (migration helper)
    if (user.plan && !user.role) {
      user.role = user.plan;
      await user.save();
    } else if (user.role && !user.plan) {
      user.plan = user.role;
      await user.save();
    }
    
    // Return fresh user data with role and plan information
    res.json({ 
      user: {
        _id: user._id,
        googleId: user.googleId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        role: user.role || user.plan || 'free', // Return role (fallback to plan for backward compatibility)
        plan: user.plan || user.role || 'free', // Return plan (fallback to role for backward compatibility)
        planStartedAt: user.planStartedAt,
        planExpiresAt: user.planExpiresAt,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching user data:', error);
    // Fallback to session user data if database query fails
    res.json({ user: req.user });
  }
};
