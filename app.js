const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const MongoStore = require('connect-mongo');
require('dotenv').config();
const { connectDB } = require('./config/db');
require('./config/passport');

const app = express();

// Connect to MongoDB (non-blocking - server will start even if MongoDB fails initially)
connectDB().catch(err => {
  console.error('⚠️  MongoDB connection failed:', err.message);
  console.error('   Server will continue, but database features will not work.');
  console.error('   Please check your MONGO_URI in .env file.\n');
});

// IMPORTANT: Raw body parser for Stripe webhooks MUST come before express.json()
// Stripe requires raw body to verify webhook signatures
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://resume-craft-ai-ten.vercel.app';

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'change_this_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
  }),
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

// Mount routes
app.use('/auth', require('./routes/auth.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/resumes', require('./routes/resume.routes'));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Resume Builder Backend API');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: 'error'
  });
});

module.exports = app;
