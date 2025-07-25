// Load environment variables
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase, supabaseAdmin } = require('../config/supabase');

class StripeSubscriptionService {
    constructor() {
        // Validate Stripe configuration
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
            console.error('💡 Please set STRIPE_SECRET_KEY in your environment variables');
            console.error('⚠️ Stripe functionality will be disabled');
            this.stripe = null;
            this.isStripeEnabled = false;
        } else {
            this.stripe = stripe;
            this.isStripeEnabled = true;
        }
        
        // Cache for subscription plans (5 minutes)
        this.plansCache = {
            data: null,
            timestamp: null,
            ttl: 5 * 60 * 1000 // 5 minutes in milliseconds
        };
        
        // Product configuration with your 6 unique IDs
        this.products = {
            starter: {
                name: 'Starter',
                monthly: {
                    priceId: 'price_1Ro9QqI161mmonCujrkWH7Dz', // EUR 79 / month
                    amount: 79,
                    currency: 'eur',
                    interval: 'month'
                },
                annual: {
                    priceId: 'price_1Ro9QqI161mmonCueNQoDMn0', // EUR 299 / year
                    amount: 299,
                    currency: 'eur',
                    interval: 'year'
                }
            },
            professional: {
                name: 'Professional',
                monthly: {
                    priceId: 'price_1Ro9TTI161mmonCucJ9gW9dZ', // EUR 79 / month
                    amount: 79,
                    currency: 'eur',
                    interval: 'month'
                },
                annual: {
                    priceId: 'price_1Ro9TTI161mmonCuDI3F9fNp', // EUR 790 / year
                    amount: 790,
                    currency: 'eur',
                    interval: 'year'
                }
            },
            enterprise: {
                name: 'Enterprise',
                monthly: {
                    priceId: 'price_1Ro9UvI161mmonCuqZExnT6k', // EUR 199 / month
                    amount: 199,
                    currency: 'eur',
                    interval: 'month'
                },
                annual: {
                    priceId: 'price_1Ro9UvI161mmonCuQwlJTSCn', // EUR 1990 / year
                    amount: 1990,
                    currency: 'eur',
                    interval: 'year'
                }
            }
        };
        
        // Validate price IDs on initialization
        this.validatePriceIds();
    }

    /**
     * Check if cache is valid
     */
    isCacheValid() {
        return this.plansCache.data && 
               this.plansCache.timestamp && 
               (Date.now() - this.plansCache.timestamp) < this.plansCache.ttl;
    }

    /**
     * Clear cache (useful for forcing refresh)
     */
    clearCache() {
        this.plansCache.data = null;
        this.plansCache.timestamp = null;
        console.log('🗑️ Subscription plans cache cleared');
    }

    /**
     * Validate that all configured price IDs exist in Stripe
     */
    async validatePriceIds() {
        try {
            if (!this.isStripeEnabled) {
                console.log('⚠️ Stripe is disabled, skipping price ID validation');
                return;
            }
            
            console.log('🔍 Validating Stripe price IDs...');
            
            for (const [planKey, plan] of Object.entries(this.products)) {
                try {
                    // Validate monthly price
                    const monthlyPrice = await this.stripe.prices.retrieve(plan.monthly.priceId);
                    console.log(`✅ Monthly price for ${plan.name}: ${monthlyPrice.unit_amount / 100} ${monthlyPrice.currency}`);
                    
                    // Validate annual price
                    const annualPrice = await this.stripe.prices.retrieve(plan.annual.priceId);
                    console.log(`✅ Annual price for ${plan.name}: ${annualPrice.unit_amount / 100} ${annualPrice.currency}`);
                    
                } catch (error) {
                    console.error(`❌ Invalid price ID for ${plan.name}:`, error.message);
                    console.error(`   Monthly: ${plan.monthly.priceId}`);
                    console.error(`   Annual: ${plan.annual.priceId}`);
                }
            }
            
            console.log('✅ Price ID validation complete');
            
        } catch (error) {
            console.error('❌ Error validating price IDs:', error);
        }
    }

    /**
     * Get pricing for a specific plan
     */
    async getPlanPricing(planKey) {
        try {
            if (!this.isStripeEnabled) {
                console.log('⚠️ Stripe is disabled, returning fallback plan pricing');
                const fallbackPlans = this.getFallbackPlans();
                return fallbackPlans.find(plan => plan.id === planKey);
            }
            
            const plan = this.products[planKey];
            if (!plan) {
                throw new Error(`Plan ${planKey} not found`);
            }

            // Fetch prices from Stripe
            const monthlyPrice = await this.stripe.prices.retrieve(plan.monthly.priceId);
            const annualPrice = await this.stripe.prices.retrieve(plan.annual.priceId);

            return {
                id: planKey,
                name: plan.name,
                monthly: {
                    priceId: plan.monthly.priceId,
                    amount: monthlyPrice.unit_amount / 100,
                    currency: monthlyPrice.currency,
                    interval: monthlyPrice.recurring.interval,
                    displayPrice: `€${Math.round(monthlyPrice.unit_amount / 100)}/month`
                },
                annual: {
                    priceId: plan.annual.priceId,
                    amount: annualPrice.unit_amount / 100,
                    currency: annualPrice.currency,
                    interval: annualPrice.recurring.interval,
                    displayPrice: `€${Math.round(annualPrice.unit_amount / 100)}/year`,
                    savings: Math.round(((monthlyPrice.unit_amount * 12 - annualPrice.unit_amount) / (monthlyPrice.unit_amount * 12)) * 100)
                }
            };

        } catch (error) {
            console.error(`❌ Error fetching pricing for plan ${planKey}:`, error);
            // Return fallback plan if Stripe fails
            const fallbackPlans = this.getFallbackPlans();
            return fallbackPlans.find(plan => plan.id === planKey);
        }
    }

    /**
     * Get all available subscription plans
     */
    async getSubscriptionPlans(forceRefresh = false) {
        try {
            // Check if Stripe is enabled
            if (!this.isStripeEnabled) {
                console.log('⚠️ Stripe is disabled, returning fallback pricing');
                return this.getFallbackPlans();
            }
            
            // Check cache first (unless force refresh is requested)
            if (!forceRefresh && this.isCacheValid()) {
                console.log('⚡ Returning cached subscription plans');
                return this.plansCache.data;
            }

            console.log('📋 Fetching subscription plans from Stripe...');
            
            const plans = [];
            
            for (const [planKey, plan] of Object.entries(this.products)) {
                try {
                    // Fetch monthly price from Stripe
                    const monthlyPrice = await this.stripe.prices.retrieve(plan.monthly.priceId);
                    
                    // Fetch annual price from Stripe
                    const annualPrice = await this.stripe.prices.retrieve(plan.annual.priceId);
                    
                    plans.push({
                        id: planKey,
                        name: plan.name,
                        monthly: {
                            priceId: plan.monthly.priceId,
                            amount: monthlyPrice.unit_amount / 100, // Convert from cents
                            currency: monthlyPrice.currency,
                            interval: monthlyPrice.recurring.interval,
                            displayPrice: `€${Math.round(monthlyPrice.unit_amount / 100)}/month`
                        },
                        annual: {
                            priceId: plan.annual.priceId,
                            amount: annualPrice.unit_amount / 100, // Convert from cents
                            currency: annualPrice.currency,
                            interval: annualPrice.recurring.interval,
                            displayPrice: `€${Math.round(annualPrice.unit_amount / 100)}/year`,
                            savings: Math.round(((monthlyPrice.unit_amount * 12 - annualPrice.unit_amount) / (monthlyPrice.unit_amount * 12)) * 100)
                        }
                    });
                    
                    console.log(`✅ Fetched prices for ${plan.name}:`, {
                        monthly: `€${Math.round(monthlyPrice.unit_amount / 100)}/month`,
                        annual: `€${Math.round(annualPrice.unit_amount / 100)}/year`
                    });
                    
                } catch (error) {
                    console.error(`❌ Error fetching prices for ${plan.name}:`, error);
                    // Fallback to hardcoded values if Stripe API fails
                    plans.push({
                        id: planKey,
                        name: plan.name,
                        monthly: {
                            priceId: plan.monthly.priceId,
                            amount: plan.monthly.amount,
                            currency: plan.monthly.currency,
                            interval: plan.monthly.interval,
                            displayPrice: `€${Math.round(plan.monthly.amount)}/month`
                        },
                        annual: {
                            priceId: plan.annual.priceId,
                            amount: plan.annual.amount,
                            currency: plan.annual.currency,
                            interval: plan.annual.interval,
                            displayPrice: `€${Math.round(plan.annual.amount)}/year`,
                            savings: Math.round(((plan.monthly.amount * 12 - plan.annual.amount) / (plan.monthly.amount * 12)) * 100)
                        }
                    });
                }
            }
            
            // Cache the results
            this.plansCache.data = plans;
            this.plansCache.timestamp = Date.now();
            
            console.log('✅ Subscription plans fetched and cached successfully');
            return plans;
            
        } catch (error) {
            console.error('❌ Error fetching subscription plans:', error);
            // Return fallback plans if everything fails
            return this.getFallbackPlans();
        }
    }

    /**
     * Get fallback plans when Stripe is not available
     */
    getFallbackPlans() {
        console.log('📋 Returning fallback subscription plans');
        return [
            {
                id: 'starter',
                name: 'Starter',
                monthly: {
                    priceId: 'price_starter_monthly',
                    amount: 50,
                    currency: 'eur',
                    interval: 'month',
                    displayPrice: '€50/month'
                },
                annual: {
                    priceId: 'price_starter_annual',
                    amount: 299,
                    currency: 'eur',
                    interval: 'year',
                    displayPrice: '€299/year',
                    savings: 50
                }
            },
            {
                id: 'professional',
                name: 'Professional',
                monthly: {
                    priceId: 'price_professional_monthly',
                    amount: 79,
                    currency: 'eur',
                    interval: 'month',
                    displayPrice: '€79/month'
                },
                annual: {
                    priceId: 'price_professional_annual',
                    amount: 790,
                    currency: 'eur',
                    interval: 'year',
                    displayPrice: '€790/year',
                    savings: 17
                }
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                monthly: {
                    priceId: 'price_enterprise_monthly',
                    amount: 199,
                    currency: 'eur',
                    interval: 'month',
                    displayPrice: '€199/month'
                },
                annual: {
                    priceId: 'price_enterprise_annual',
                    amount: 1990,
                    currency: 'eur',
                    interval: 'year',
                    displayPrice: '€1990/year',
                    savings: 17
                }
            }
        ];
    }

    /**
     * Create a subscription for a customer
     */
    async createSubscription(customerId, priceId, metadata = {}) {
        try {
            console.log('💳 Creating subscription for customer:', customerId);
            console.log('💰 Price ID:', priceId);
            
            const subscription = await this.stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    ...metadata,
                    created_at: new Date().toISOString()
                }
            });
            
            console.log('✅ Subscription created successfully:', subscription.id);
            return subscription;
            
        } catch (error) {
            console.error('❌ Error creating subscription:', error);
            throw error;
        }
    }

    /**
     * Get or create a Stripe customer for a user
     */
    async getOrCreateCustomer(userId, email, name) {
        try {
            console.log('👤 Getting or creating customer for user:', userId);
            
            // Check if customer already exists in database
            const { data: existingCustomer, error: fetchError } = await supabaseAdmin
                .from('stripe_customers')
                .select('stripe_customer_id')
                .eq('user_id', userId)
                .single();
            
            if (existingCustomer && existingCustomer.stripe_customer_id) {
                console.log('✅ Existing customer found:', existingCustomer.stripe_customer_id);
                return existingCustomer.stripe_customer_id;
            }
            
            // Create new customer in Stripe
            const customer = await this.stripe.customers.create({
                email: email,
                name: name,
                metadata: {
                    user_id: userId
                }
            });
            
            // Save customer to database
            const { error: insertError } = await supabaseAdmin
                .from('stripe_customers')
                .insert({
                    user_id: userId,
                    stripe_customer_id: customer.id,
                    email: email,
                    name: name
                });
            
            if (insertError) {
                console.error('❌ Error saving customer to database:', insertError);
            }
            
            console.log('✅ New customer created:', customer.id);
            return customer.id;
            
        } catch (error) {
            console.error('❌ Error getting or creating customer:', error);
            throw error;
        }
    }

    /**
     * Get customer's active subscriptions
     */
    async getCustomerSubscriptions(customerId) {
        try {
            console.log('📋 Fetching subscriptions for customer:', customerId);
            
            const subscriptions = await this.stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                expand: ['data.default_payment_method']
            });
            
            console.log('✅ Customer subscriptions fetched:', subscriptions.data.length);
            return subscriptions.data;
            
        } catch (error) {
            console.error('❌ Error fetching customer subscriptions:', error);
            throw error;
        }
    }

    /**
     * Cancel a subscription
     */
    async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        try {
            console.log('❌ Cancelling subscription:', subscriptionId);
            
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: cancelAtPeriodEnd
            });
            
            console.log('✅ Subscription cancelled successfully');
            return subscription;
            
        } catch (error) {
            console.error('❌ Error cancelling subscription:', error);
            throw error;
        }
    }

    /**
     * Reactivate a cancelled subscription
     */
    async reactivateSubscription(subscriptionId) {
        try {
            console.log('🔄 Reactivating subscription:', subscriptionId);
            
            const subscription = await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false
            });
            
            console.log('✅ Subscription reactivated successfully');
            return subscription;
            
        } catch (error) {
            console.error('❌ Error reactivating subscription:', error);
            throw error;
        }
    }

    /**
     * Update subscription (change plan)
     */
    async updateSubscription(subscriptionId, newPriceId) {
        try {
            console.log('🔄 Updating subscription:', subscriptionId);
            console.log('💰 New price ID:', newPriceId);
            
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            
            const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPriceId,
                }],
                proration_behavior: 'create_prorations'
            });
            
            console.log('✅ Subscription updated successfully');
            return updatedSubscription;
            
        } catch (error) {
            console.error('❌ Error updating subscription:', error);
            throw error;
        }
    }

    /**
     * Get subscription details
     */
    async getSubscription(subscriptionId) {
        try {
            console.log('📋 Fetching subscription details:', subscriptionId);
            
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId, {
                expand: ['customer', 'default_payment_method', 'latest_invoice']
            });
            
            console.log('✅ Subscription details fetched');
            return subscription;
            
        } catch (error) {
            console.error('❌ Error fetching subscription details:', error);
            throw error;
        }
    }

    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(customerId, priceId, successUrl, cancelUrl, metadata = {}) {
        try {
            console.log('🛒 Creating checkout session for customer:', customerId);
            
            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: priceId,
                    quantity: 1,
                }],
                mode: 'subscription',
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    ...metadata,
                    created_at: new Date().toISOString()
                }
            });
            
            console.log('✅ Checkout session created:', session.id);
            return session;
            
        } catch (error) {
            console.error('❌ Error creating checkout session:', error);
            throw error;
        }
    }

    /**
     * Create a portal session for customer
     */
    async createPortalSession(customerId, returnUrl) {
        try {
            console.log('🚪 Creating portal session for customer:', customerId);
            
            const session = await this.stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });
            
            console.log('✅ Portal session created:', session.id);
            return session;
            
        } catch (error) {
            console.error('❌ Error creating portal session:', error);
            throw error;
        }
    }

    /**
     * Handle webhook events
     */
    async handleWebhookEvent(event) {
        try {
            console.log('📡 Processing webhook event:', event.type);
            
            switch (event.type) {
                case 'customer.subscription.created':
                    await this.handleSubscriptionCreated(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                default:
                    console.log('⚠️ Unhandled webhook event type:', event.type);
            }
            
        } catch (error) {
            console.error('❌ Error handling webhook event:', error);
            throw error;
        }
    }

    /**
     * Handle subscription created event
     */
    async handleSubscriptionCreated(subscription) {
        try {
            console.log('✅ Handling subscription created:', subscription.id);
            
            // Update user's subscription status in database
            const { error } = await supabaseAdmin
                .from('subscriptions')
                .upsert({
                    user_id: subscription.metadata.user_id,
                    stripe_subscription_id: subscription.id,
                    status: subscription.status,
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    price_id: subscription.items.data[0].price.id
                });
            
            if (error) {
                console.error('❌ Error updating subscription in database:', error);
            }
            
        } catch (error) {
            console.error('❌ Error handling subscription created:', error);
        }
    }

    /**
     * Handle subscription updated event
     */
    async handleSubscriptionUpdated(subscription) {
        try {
            console.log('🔄 Handling subscription updated:', subscription.id);
            
            // Update subscription in database
            const { error } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    status: subscription.status,
                    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                    price_id: subscription.items.data[0].price.id
                })
                .eq('stripe_subscription_id', subscription.id);
            
            if (error) {
                console.error('❌ Error updating subscription in database:', error);
            }
            
        } catch (error) {
            console.error('❌ Error handling subscription updated:', error);
        }
    }

    /**
     * Handle subscription deleted event
     */
    async handleSubscriptionDeleted(subscription) {
        try {
            console.log('❌ Handling subscription deleted:', subscription.id);
            
            // Update subscription status in database
            const { error } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    status: 'cancelled'
                })
                .eq('stripe_subscription_id', subscription.id);
            
            if (error) {
                console.error('❌ Error updating subscription in database:', error);
            }
            
        } catch (error) {
            console.error('❌ Error handling subscription deleted:', error);
        }
    }

    /**
     * Handle payment succeeded event
     */
    async handlePaymentSucceeded(invoice) {
        try {
            console.log('✅ Handling payment succeeded:', invoice.id);
            
            // Update payment status in database
            const { error } = await supabaseAdmin
                .from('payments')
                .insert({
                    stripe_payment_intent_id: invoice.payment_intent,
                    amount: invoice.amount_paid,
                    currency: invoice.currency,
                    status: 'succeeded',
                    payment_method: 'stripe'
                });
            
            if (error) {
                console.error('❌ Error saving payment to database:', error);
            }
            
        } catch (error) {
            console.error('❌ Error handling payment succeeded:', error);
        }
    }

    /**
     * Handle payment failed event
     */
    async handlePaymentFailed(invoice) {
        try {
            console.log('❌ Handling payment failed:', invoice.id);
            
            // Update payment status in database
            const { error } = await supabaseAdmin
                .from('payments')
                .insert({
                    stripe_payment_intent_id: invoice.payment_intent,
                    amount: invoice.amount_due,
                    currency: invoice.currency,
                    status: 'failed',
                    payment_method: 'stripe'
                });
            
            if (error) {
                console.error('❌ Error saving payment to database:', error);
            }
            
        } catch (error) {
            console.error('❌ Error handling payment failed:', error);
        }
    }
}

module.exports = new StripeSubscriptionService(); 