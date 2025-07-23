const express = require('express');
const router = express.Router();
const stripeService = require('../utils/stripeService');

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripeService.verifyWebhookSignature(req.body, sig, webhookSecret);
        console.log('✅ Webhook signature verified');
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // Handle the event
        await stripeService.handleWebhookEvent(event);
        console.log('✅ Webhook event processed successfully');
        res.json({ received: true });
    } catch (error) {
        console.error('❌ Error processing webhook event:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get Stripe configuration (public key)
router.get('/config', (req, res) => {
    try {
        res.json({
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });
    } catch (error) {
        console.error('❌ Error getting Stripe config:', error);
        res.status(500).json({ error: 'Failed to get Stripe configuration' });
    }
});

module.exports = router; 