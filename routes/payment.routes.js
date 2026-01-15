const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { ensureAuth } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/payment/create-session
 * @desc    Create Stripe checkout session
 * @access  Private (requires authentication)
 */
router.post('/create-session', ensureAuth, paymentController.createCheckoutSession);

/**
 * @route   POST /api/payment/webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (verified by Stripe signature)
 * @note    This route uses raw body parser (configured in app.js)
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * @route   POST /api/payment/verify-session
 * @desc    Verify payment session and update user plan (backup to webhooks)
 * @access  Private (requires authentication)
 */
router.post('/verify-session', ensureAuth, paymentController.verifyPaymentSession);

/**
 * @route   GET /api/payment/status
 * @desc    Get current user's subscription status
 * @access  Private (requires authentication)
 */
router.get('/status', ensureAuth, paymentController.getSubscriptionStatus);

/**
 * @route   POST /api/payment/cancel-subscription
 * @desc    Cancel user's subscription
 * @access  Private (requires authentication)
 */
router.post('/cancel-subscription', ensureAuth, paymentController.cancelSubscription);

module.exports = router;
