const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');

// Lazy load stripeSubscriptionService to avoid initialization errors
let stripeSubscriptionService = null;
function getStripeSubscriptionService() {
    if (!stripeSubscriptionService) {
        try {
            stripeSubscriptionService = require('../utils/stripeSubscriptionService');
        } catch (error) {
            console.error('❌ Failed to load Stripe subscription service:', error.message);
            // Return null instead of throwing error - will be handled in routes
            return null;
        }
    }
    return stripeSubscriptionService;
}

// Real Stripe Price IDs - Update these with your actual Stripe price IDs
const STRIPE_PRICE_IDS = {
    starter: {
        monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_1OqX8X2eZvKYlo2C8Q8Q8Q8Q',
        annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_1OqX8X2eZvKYlo2C8Q8Q8Q8Q8'
    },
    professional: {
        monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_1OqX8X2eZvKYlo2C9Q9Q9Q9Q9',
        annual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID || 'price_1OqX8X2eZvKYlo2C9Q9Q9Q9Q9Q'
    },
    enterprise: {
        monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_1OqX8X2eZvKYlo2C0Q0Q0Q0Q0',
        annual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || 'price_1OqX8X2eZvKYlo2C0Q0Q0Q0Q0Q'
    }
};

// Fallback subscription plans when Stripe is not available
const fallbackPlans = [
    {
        id: "free",
        name: "Free",
        description: "Perfect for small teams getting started",
        features: [
            "Up to 3 employees",
            "1 organization",
            "Basic HR features",
            "Email support"
        ],
        monthly: {
            priceId: "free",
            amount: 0,
            currency: "eur",
            interval: "month",
            displayPrice: "Free"
        },
        annual: {
            priceId: "free",
            amount: 0,
            currency: "eur",
            interval: "year",
            displayPrice: "Free"
        }
    },
    {
        id: "starter",
        name: "Starter",
        description: "Great for growing businesses",
        features: [
            "Up to 10 employees",
            "3 organizations",
            "Analytics dashboard",
            "Priority email support"
        ],
        monthly: {
            priceId: STRIPE_PRICE_IDS.starter.monthly,
            amount: 29,
            currency: "eur",
            interval: "month",
            displayPrice: "€29/month"
        },
        annual: {
            priceId: STRIPE_PRICE_IDS.starter.annual,
            amount: 299,
            currency: "eur",
            interval: "year",
            displayPrice: "€299/year",
            savings: 14
        }
    },
    {
        id: "professional",
        name: "Professional",
        description: "Advanced features for established companies",
        features: [
            "Up to 100 employees",
            "5 organizations",
            "Advanced analytics",
            "API access",
            "Priority support"
        ],
        monthly: {
            priceId: STRIPE_PRICE_IDS.professional.monthly,
            amount: 79,
            currency: "eur",
            interval: "month",
            displayPrice: "€79/month"
        },
        annual: {
            priceId: STRIPE_PRICE_IDS.professional.annual,
            amount: 790,
            currency: "eur",
            interval: "year",
            displayPrice: "€790/year",
            savings: 17
        }
    },
    {
        id: "enterprise",
        name: "Enterprise",
        description: "Unlimited scale for large organizations",
        features: [
            "Unlimited employees",
            "Unlimited organizations",
            "Advanced analytics",
            "API access",
            "Priority support",
            "Custom integrations"
        ],
        monthly: {
            priceId: STRIPE_PRICE_IDS.enterprise.monthly,
            amount: 199,
            currency: "eur",
            interval: "month",
            displayPrice: "€199/month"
        },
        annual: {
            priceId: STRIPE_PRICE_IDS.enterprise.annual,
            amount: 1990,
            currency: "eur",
            interval: "year",
            displayPrice: "€1990/year",
            savings: 17
        }
    }
];

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
        
        const service = getStripeSubscriptionService();
        let plans = [];
        if (!service) {
            console.log('⚠️ Stripe service not available, using fallback plans');
            plans = fallbackPlans;
        } else {
            plans = await service.getSubscriptionPlans(forceRefresh);
        }
        // Always ensure the Free plan is present and correct
        const freePlan = {
            id: "free",
            name: "Free",
            description: "Perfect for small teams getting started",
            features: [
                "Up to 3 employees",
                "1 organization",
                "Basic HR features",
                "Email support"
            ],
            monthly: {
                priceId: "free",
                amount: 0,
                currency: "eur",
                interval: "month",
                displayPrice: "Free"
            },
            annual: {
                priceId: "free",
                amount: 0,
                currency: "eur",
                interval: "year",
                displayPrice: "Free"
            }
        };
        // Remove any existing free plan from plans
        plans = plans.filter(p => p.id !== 'free');
        // Add the correct free plan at the start
        plans.unshift(freePlan);
        res.json({ success: true, plans });
    } catch (error) {
        console.error('❌ Error fetching plans:', error);
        console.log('⚠️ Using fallback plans due to error');
        // Always ensure the Free plan is present in fallback
        const plans = fallbackPlans.filter(p => p.id !== 'free');
        plans.unshift({
            id: "free",
            name: "Free",
            description: "Perfect for small teams getting started",
            features: [
                "Up to 3 employees",
                "1 organization",
                "Basic HR features",
                "Email support"
            ],
            monthly: {
                priceId: "free",
                amount: 0,
                currency: "eur",
                interval: "month",
                displayPrice: "Free"
            },
            annual: {
                priceId: "free",
                amount: 0,
                currency: "eur",
                interval: "year",
                displayPrice: "Free"
            }
        });
        res.json({ success: true, plans });
    }
});

// Force refresh subscription plans cache
router.post('/plans/refresh', async (req, res) => {
    try {
        console.log('🔄 Force refreshing subscription plans cache...');
        
        const service = getStripeSubscriptionService();
        if (!service) {
            console.log('⚠️ Stripe service not available, returning fallback plans');
            res.json({ success: true, plans: fallbackPlans, message: 'Fallback plans returned' });
            return;
        }
        
        service.clearCache();
        const plans = await service.getSubscriptionPlans(true);
        res.json({ success: true, plans, message: 'Cache refreshed successfully' });
    } catch (error) {
        console.error('❌ Error refreshing plans:', error);
        console.log('⚠️ Using fallback plans due to error');
        res.json({ success: true, plans: fallbackPlans, message: 'Fallback plans returned due to error' });
    }
});

// Get pricing for a specific plan
router.get('/plans/:planId', async (req, res) => {
    try {
        const { planId } = req.params;
        console.log('📋 Fetching pricing for plan:', planId);
        
        const service = getStripeSubscriptionService();
        if (!service) {
            console.log('⚠️ Stripe service not available, using fallback plan');
            const fallbackPlan = fallbackPlans.find(p => p.id === planId);
            if (fallbackPlan) {
                res.json({ success: true, plan: fallbackPlan });
            } else {
                res.status(404).json({ error: 'Plan not found' });
            }
            return;
        }
        
        const plan = await service.getPlanPricing(planId);
        res.json({ success: true, plan });
    } catch (error) {
        console.error('❌ Error fetching plan pricing:', error);
        console.log('⚠️ Using fallback plan due to error');
        const fallbackPlan = fallbackPlans.find(p => p.id === planId);
        if (fallbackPlan) {
            res.json({ success: true, plan: fallbackPlan });
        } else {
            res.status(404).json({ error: 'Plan not found' });
        }
    }
});

// Get user's current subscription
router.get('/current', authenticateUser, async (req, res) => {
    try {
        console.log('📋 Fetching current subscription for user:', req.user.id);
        
        const { data: subscription, error } = await supabaseAdmin
            .from('subscriptions')
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
        
        // If no subscription found, create a free tier subscription
        if (!subscription) {
            console.log('📋 Creating free tier subscription for user:', req.user.id);
            const { data: newSubscription, error: insertError } = await supabaseAdmin
                .from('subscriptions')
                .insert({
                    user_id: req.user.id,
                    plan_name: 'free',
                    status: 'active'
                })
                .select()
                .single();
            
            if (insertError) {
                console.error('❌ Error creating free subscription:', insertError);
                return res.status(500).json({ error: 'Failed to create free subscription' });
            }
            
            return res.json({ 
                success: true, 
                subscription: newSubscription 
            });
        }
        
        res.json({ 
            success: true, 
            subscription: subscription 
        });
        
    } catch (error) {
        console.error('❌ Error fetching current subscription:', error);
        res.status(500).json({ error: 'Failed to fetch current subscription' });
    }
});

// Create checkout session
router.post('/create-checkout', authenticateUser, async (req, res) => {
    try {
        const { priceId, planId, billingCycle } = req.body;
        console.log('💳 Creating checkout session for user:', req.user.id, 'plan:', planId);
        
        const service = getStripeSubscriptionService();
        if (!service) {
            return res.status(500).json({ error: 'Stripe service not available' });
        }
        
        const checkoutSession = await service.createCheckoutSession({
            userId: req.user.id,
            priceId: priceId,
            planId: planId,
            billingCycle: billingCycle,
            successUrl: `${process.env.BASE_URL}/subscriptions?success=true`,
            cancelUrl: `${process.env.BASE_URL}/subscriptions?canceled=true`
        });
        
        res.json({ 
            success: true, 
            checkoutUrl: checkoutSession.url 
        });
        
    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Create billing portal session
router.post('/billing-portal', authenticateUser, async (req, res) => {
    try {
        console.log('🏦 Creating billing portal session for user:', req.user.id);
        
        const service = getStripeSubscriptionService();
        if (!service) {
            return res.status(500).json({ error: 'Stripe service not available' });
        }
        
        const portalSession = await service.createPortalSession(req.user.id, `${process.env.BASE_URL}/subscription-settings`);
        
        res.json({ 
            success: true, 
            portalUrl: portalSession.url 
        });
        
    } catch (error) {
        console.error('❌ Error creating billing portal session:', error);
        res.status(500).json({ error: 'Failed to create billing portal session' });
    }
});

// Cancel subscription
router.post('/cancel', authenticateUser, async (req, res) => {
    try {
        console.log('❌ Canceling subscription for user:', req.user.id);
        
        const service = getStripeSubscriptionService();
        if (!service) {
            return res.status(500).json({ error: 'Stripe service not available' });
        }
        
        await service.cancelSubscription(req.user.id);
        
        res.json({ 
            success: true, 
            message: 'Subscription cancelled successfully' 
        });
        
    } catch (error) {
        console.error('❌ Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
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
        const customerId = await getStripeSubscriptionService().getOrCreateCustomer(
            req.user.id,
            req.user.email,
            req.user.user_metadata?.full_name || req.user.email
        );
        
        // Create checkout session
        const session = await getStripeSubscriptionService().createCheckoutSession(
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
        
        // Get customer ID from users table (already renamed from profiles)
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('stripe_customer_id')
            .eq('id', req.user.id)
            .single();
        
        if (error || !user || !user.stripe_customer_id) {
            return res.status(404).json({ error: 'No customer found for this user' });
        }
        
        // Create portal session
        const session = await getStripeSubscriptionService().createPortalSession(
            user.stripe_customer_id,
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
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Cancel subscription
        const cancelledSubscription = await getStripeSubscriptionService().cancelSubscription(
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
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Reactivate subscription
        const reactivatedSubscription = await getStripeSubscriptionService().reactivateSubscription(
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
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Update subscription
        const updatedSubscription = await getStripeSubscriptionService().updateSubscription(
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
            .from('subscriptions')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Get detailed subscription from Stripe
        const stripeSubscription = await getStripeSubscriptionService().getSubscription(subscriptionId);
        
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
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', req.user.id)
            .eq('stripe_subscription_id', subscriptionId)
            .single();
        
        if (error || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        
        // Get payments from database
        const { data: payments, error: paymentsError } = await supabaseAdmin
            .from('payments')
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
            event = getStripeSubscriptionService().stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return res.status(400).json({ error: 'Webhook signature verification failed' });
        }
        
        // Handle the event
                    await getStripeSubscriptionService().handleWebhookEvent(event);
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get user's plan limits
router.get('/limits/plan', authenticateUser, async (req, res) => {
    try {
        console.log('📋 Fetching plan limits for user:', req.user.id);
        
        const { data: limits, error } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error fetching plan limits:', error);
            return res.status(500).json({ error: 'Failed to fetch plan limits' });
        }
        
        res.json({ 
            success: true, 
            limits: limits[0] || {
                plan_name: 'free',
                max_employees: 3,
                max_organizations: 1,
                has_analytics: false,
                has_advanced_features: false,
                has_api_access: false,
                has_priority_support: false
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching plan limits:', error);
        res.status(500).json({ error: 'Failed to fetch plan limits' });
    }
});

// Check if user can add more employees
router.get('/limits/can-add-employee', authenticateUser, async (req, res) => {
    try {
        console.log('📋 Checking if user can add employee:', req.user.id);
        
        const { data: canAdd, error } = await supabaseAdmin
            .rpc('can_add_employee', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error checking employee limit:', error);
            return res.status(500).json({ error: 'Failed to check employee limit' });
        }
        
        res.json({ 
            success: true, 
            canAdd: canAdd || false
        });
        
    } catch (error) {
        console.error('❌ Error checking employee limit:', error);
        res.status(500).json({ error: 'Failed to check employee limit' });
    }
});

// Get current employee count
router.get('/limits/employee-count', authenticateUser, async (req, res) => {
    try {
        console.log('📋 Fetching employee count for user:', req.user.id);
        
        // Get user's organization
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('organization_id')
            .eq('id', req.user.id)
            .single();
        
        if (userError || !user.organization_id) {
            return res.json({ 
                success: true, 
                count: 0,
                maxEmployees: 3
            });
        }
        
        // Count employees in the organization
        const { count, error: countError } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', user.organization_id);
        
        if (countError) {
            console.error('❌ Error counting employees:', countError);
            return res.status(500).json({ error: 'Failed to count employees' });
        }
        
        // Get plan limits
        const { data: limits, error: limitsError } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        const maxEmployees = limitsError ? 3 : (limits[0]?.max_employees || 3);
        
        res.json({ 
            success: true, 
            count: count || 0,
            maxEmployees: maxEmployees
        });
        
    } catch (error) {
        console.error('❌ Error fetching employee count:', error);
        res.status(500).json({ error: 'Failed to fetch employee count' });
    }
});

module.exports = router; 