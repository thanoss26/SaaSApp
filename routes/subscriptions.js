const express = require('express');
const router = express.Router();
const stripeSubscriptionService = require('../utils/stripeSubscriptionService');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// Get all subscription plans
router.get('/plans', async (req, res) => {
    try {
        const forceRefresh = req.query.refresh === 'true';
        console.log('📋 Fetching subscription plans...', forceRefresh ? '(force refresh)' : '');
        const plans = await stripeSubscriptionService.getSubscriptionPlans(forceRefresh);
        res.json({ success: true, plans });
    } catch (error) {
        console.error('❌ Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
});

// Force refresh subscription plans cache
router.post('/plans/refresh', async (req, res) => {
    try {
        console.log('🔄 Force refreshing subscription plans cache...');
        stripeSubscriptionService.clearCache();
        const plans = await stripeSubscriptionService.getSubscriptionPlans(true);
        res.json({ success: true, plans, message: 'Cache refreshed successfully' });
    } catch (error) {
        console.error('❌ Error refreshing plans:', error);
        res.status(500).json({ error: 'Failed to refresh subscription plans' });
    }
});

// Get pricing for a specific plan
router.get('/plans/:planId', async (req, res) => {
    try {
        const { planId } = req.params;
        console.log('📋 Fetching pricing for plan:', planId);
        
        const plan = await stripeSubscriptionService.getPlanPricing(planId);
        res.json({ success: true, plan });
    } catch (error) {
        console.error('❌ Error fetching plan pricing:', error);
        res.status(500).json({ error: 'Failed to fetch plan pricing' });
    }
});

// Get user's current subscription
router.get('/current', authenticateUser, async (req, res) => {
    try {
        console.log('📋 Fetching current subscription for user:', req.user.id);
        
        const { data: subscription, error } = await supabaseAdmin
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('❌ Database error:', error);
            return res.status(500).json({ error: 'Failed to fetch subscription' });
        }
        
        res.json({ 
            success: true, 
            subscription: subscription || null 
        });
        
    } catch (error) {
        console.error('❌ Error fetching current subscription:', error);
        res.status(500).json({ error: 'Failed to fetch current subscription' });
    }
});

// Create checkout session for subscription
router.post('/create-checkout-session', authenticateUser, async (req, res) => {
    try {
        const { priceId, successUrl, cancelUrl } = req.body;
        
        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }
        
        console.log('🛒 Creating checkout session for user:', req.user.id);
        console.log('💰 Price ID:', priceId);
        
        // Get or create Stripe customer
        const customerId = await stripeSubscriptionService.getOrCreateCustomer(
            req.user.id,
            req.user.email,
            req.user.user_metadata?.full_name || req.user.email
        );
        
        // Create checkout session
        const session = await stripeSubscriptionService.createCheckoutSession(
            customerId,
            priceId,
            successUrl || `${req.protocol}://${req.get('host')}/dashboard.html`,
            cancelUrl || `${req.protocol}://${req.get('host')}/landing.html`,
            {
                user_id: req.user.id,
                price_id: priceId
            }
        );
        
        res.json({ 
            success: true, 
            sessionId: session.id,
            url: session.url 
        });
        
    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Create customer portal session
router.post('/create-portal-session', authenticateUser, async (req, res) => {
    try {
        const { returnUrl } = req.body;
        
        console.log('🚪 Creating portal session for user:', req.user.id);
        
        // Get customer ID
        const { data: customer, error } = await supabaseAdmin
            .from('stripe_customers')
            .select('stripe_customer_id')
            .eq('user_id', req.user.id)
            .single();
        
        if (error || !customer) {
            return res.status(404).json({ error: 'No customer found for this user' });
        }
        
        // Create portal session
        const session = await stripeSubscriptionService.createPortalSession(
            customer.stripe_customer_id,
            returnUrl || `${req.protocol}://${req.get('host')}/dashboard.html`
        );
        
        res.json({ 
            success: true, 
            url: session.url 
        });
        
    } catch (error) {
        console.error('❌ Error creating portal session:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// Cancel subscription
router.post('/cancel', authenticateUser, async (req, res) => {
    try {
        const { subscriptionId, cancelAtPeriodEnd = true } = req.body;
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }
        
        console.log('❌ Cancelling subscription:', subscriptionId);
        
        // Verify user owns this subscription
        const { data: subscription, error } = await supabaseAdmin
            .from('user_subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Cancel subscription
        const cancelledSubscription = await stripeSubscriptionService.cancelSubscription(
            subscriptionId,
            cancelAtPeriodEnd
        );
        
        res.json({ 
            success: true, 
            subscription: cancelledSubscription 
        });
        
    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// Reactivate subscription
router.post('/reactivate', authenticateUser, async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }
        
        console.log('🔄 Reactivating subscription:', subscriptionId);
        
        // Verify user owns this subscription
        const { data: subscription, error } = await supabaseAdmin
            .from('user_subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Reactivate subscription
        const reactivatedSubscription = await stripeSubscriptionService.reactivateSubscription(
            subscriptionId
        );
        
        res.json({ 
            success: true, 
            subscription: reactivatedSubscription 
        });
        
    } catch (error) {
        console.error('❌ Error reactivating subscription:', error);
        res.status(500).json({ error: 'Failed to reactivate subscription' });
    }
});

// Update subscription (change plan)
router.post('/update', authenticateUser, async (req, res) => {
    try {
        const { subscriptionId, newPriceId } = req.body;
        
        if (!subscriptionId || !newPriceId) {
            return res.status(400).json({ error: 'Subscription ID and new price ID are required' });
        }
        
        console.log('🔄 Updating subscription:', subscriptionId);
        console.log('💰 New price ID:', newPriceId);
        
        // Verify user owns this subscription
        const { data: subscription, error } = await supabaseAdmin
            .from('user_subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Update subscription
        const updatedSubscription = await stripeSubscriptionService.updateSubscription(
            subscriptionId,
            newPriceId
        );
        
        res.json({ 
            success: true, 
            subscription: updatedSubscription 
        });
        
    } catch (error) {
        console.error('❌ Error updating subscription:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
    }
});

// Get subscription details
router.get('/:subscriptionId', authenticateUser, async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        
        console.log('📋 Fetching subscription details:', subscriptionId);
        
        // Verify user owns this subscription
        const { data: subscription, error } = await supabaseAdmin
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Get detailed subscription from Stripe
        const stripeSubscription = await stripeSubscriptionService.getSubscription(subscriptionId);
        
        res.json({ 
            success: true, 
            subscription: {
                ...subscription,
                stripe_details: stripeSubscription
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching subscription details:', error);
        res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
});

// Get subscription payments
router.get('/:subscriptionId/payments', authenticateUser, async (req, res) => {
    try {
        const { subscriptionId } = req.params;
        
        console.log('📋 Fetching payments for subscription:', subscriptionId);
        
        // Verify user owns this subscription
        const { data: subscription, error } = await supabaseAdmin
            .from('user_subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Get payments from database
        const { data: payments, error: paymentsError } = await supabaseAdmin
            .from('subscription_payments')
            .select('*')
            .eq('stripe_subscription_id', subscriptionId)
            .order('created_at', { ascending: false });
        
        if (paymentsError) {
            console.error('❌ Database error:', paymentsError);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }
        
        res.json({ 
            success: true, 
            payments: payments || [] 
        });
        
    } catch (error) {
        console.error('❌ Error fetching subscription payments:', error);
        res.status(500).json({ error: 'Failed to fetch subscription payments' });
    }
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        if (!endpointSecret) {
            console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Webhook secret not configured' });
        }
        
        let event;
        
        try {
            event = stripeSubscriptionService.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return res.status(400).json({ error: 'Webhook signature verification failed' });
        }
        
        // Handle the event
        await stripeSubscriptionService.handleWebhookEvent(event);
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router; 