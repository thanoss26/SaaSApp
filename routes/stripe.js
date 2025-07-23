const express = require('express');
const router = express.Router();

// Lazy load stripeService to avoid initialization errors
let stripeService = null;
function getStripeService() {
    if (!stripeService) {
        try {
            stripeService = require('../utils/stripeService');
        } catch (error) {
            console.error('❌ Failed to load Stripe service:', error.message);
            throw new Error('Stripe service not available');
        }
    }
    return stripeService;
}

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = getStripeService().verifyWebhookSignature(req.body, sig, webhookSecret);
        console.log('✅ Webhook signature verified');
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        // Handle the event
        await getStripeService().handleWebhookEvent(event);
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