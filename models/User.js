const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String },
    email: { type: String, index: true },
    avatar: { type: String },
    provider: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    
    // Payment & Subscription Fields
    role: { 
      type: String, 
      enum: ['free', 'pro', 'business'], 
      default: 'free' 
    },
    plan: { 
      type: String, 
      enum: ['free', 'pro', 'business'], 
      default: 'free' 
    },
    planStartedAt: { type: Date },
    planExpiresAt: { type: Date },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
