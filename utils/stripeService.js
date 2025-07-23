const { supabase, supabaseAdmin } = require('../config/supabase');

class StripeService {
    constructor() {
        this._stripe = null;
    }

    /**
     * Get Stripe instance with lazy initialization
     */
    get stripe() {
        if (!this._stripe) {
            if (!process.env.STRIPE_SECRET_KEY) {
                throw new Error('STRIPE_SECRET_KEY environment variable is not set');
            }
            this._stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        }
        return this._stripe;
    }

    /**
     * Create or get a Stripe customer for a user
     */
    async createOrGetCustomer(userId, userEmail, userName) {
        try {
            console.log('🔍 Checking if customer exists for user:', userId);
            
            // First check if we already have a Stripe customer ID for this user
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('stripe_customer_id')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('❌ Error fetching profile:', profileError);
                throw new Error('Failed to fetch user profile');
            }

            // If customer already exists, return it
            if (profile.stripe_customer_id) {
                console.log('✅ Existing Stripe customer found:', profile.stripe_customer_id);
                return await this.stripe.customers.retrieve(profile.stripe_customer_id);
            }

            // Create new customer
            console.log('🆕 Creating new Stripe customer for:', userEmail);
            const customer = await this.stripe.customers.create({
                email: userEmail,
                name: userName,
                metadata: {
                    user_id: userId
                }
            });

            // Save customer ID to database
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ stripe_customer_id: customer.id })
                .eq('id', userId);

            if (updateError) {
                console.error('❌ Error saving Stripe customer ID:', updateError);
                throw new Error('Failed to save Stripe customer ID');
            }

            console.log('✅ Stripe customer created and saved:', customer.id);
            return customer;

        } catch (error) {
            console.error('❌ Error in createOrGetCustomer:', error);
            throw error;
        }
    }

    /**
     * Create a payment intent for payroll payment
     */
    async createPaymentIntent(payrollId, amount, currency = 'eur', customerId = null) {
        try {
            console.log('💰 Creating payment intent for payroll:', payrollId);
            console.log('💵 Amount:', amount, currency);

            const paymentIntentData = {
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                metadata: {
                    payroll_id: payrollId,
                    payment_type: 'payroll'
                },
                automatic_payment_methods: {
                    enabled: true,
                }
            };

            if (customerId) {
                paymentIntentData.customer = customerId;
            }

            const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);
            
            console.log('✅ Payment intent created:', paymentIntent.id);
            return paymentIntent;

        } catch (error) {
            console.error('❌ Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * Process a payment using payment intent
     */
    async processPayment(paymentIntentId, paymentMethodId = null) {
        try {
            console.log('💳 Processing payment for intent:', paymentIntentId);

            let paymentIntent;
            
            if (paymentMethodId) {
                // Confirm payment with specific payment method
                paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
                    payment_method: paymentMethodId
                });
            } else {
                // Just retrieve the payment intent
                paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            }

            console.log('✅ Payment processed:', paymentIntent.status);
            return paymentIntent;

        } catch (error) {
            console.error('❌ Error processing payment:', error);
            throw error;
        }
    }

    /**
     * Create a refund for a payment
     */
    async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
        try {
            console.log('🔄 Creating refund for payment:', paymentIntentId);

            const refundData = {
                payment_intent: paymentIntentId,
                reason: reason
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to cents
            }

            const refund = await this.stripe.refunds.create(refundData);
            
            console.log('✅ Refund created:', refund.id);
            return refund;

        } catch (error) {
            console.error('❌ Error creating refund:', error);
            throw error;
        }
    }

    /**
     * Get payment methods for a customer
     */
    async getCustomerPaymentMethods(customerId) {
        try {
            console.log('💳 Fetching payment methods for customer:', customerId);
            
            const paymentMethods = await this.stripe.paymentMethods.list({
                customer: customerId,
                type: 'card'
            });

            console.log('✅ Payment methods retrieved:', paymentMethods.data.length);
            return paymentMethods.data;

        } catch (error) {
            console.error('❌ Error fetching payment methods:', error);
            throw error;
        }
    }

    /**
     * Attach payment method to customer
     */
    async attachPaymentMethod(paymentMethodId, customerId) {
        try {
            console.log('🔗 Attaching payment method to customer:', customerId);
            
            const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
                customer: customerId
            });

            console.log('✅ Payment method attached:', paymentMethod.id);
            return paymentMethod;

        } catch (error) {
            console.error('❌ Error attaching payment method:', error);
            throw error;
        }
    }

    /**
     * Create a setup intent for saving payment methods
     */
    async createSetupIntent(customerId) {
        try {
            console.log('🔧 Creating setup intent for customer:', customerId);
            
            const setupIntent = await this.stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ['card'],
                usage: 'off_session'
            });

            console.log('✅ Setup intent created:', setupIntent.id);
            return setupIntent;

        } catch (error) {
            console.error('❌ Error creating setup intent:', error);
            throw error;
        }
    }

    /**
     * Get payment history for a customer
     */
    async getCustomerPayments(customerId, limit = 10) {
        try {
            console.log('📊 Fetching payment history for customer:', customerId);
            
            const payments = await this.stripe.paymentIntents.list({
                customer: customerId,
                limit: limit
            });

            console.log('✅ Payment history retrieved:', payments.data.length);
            return payments.data;

        } catch (error) {
            console.error('❌ Error fetching payment history:', error);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature, webhookSecret) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret
            );
            return event;
        } catch (error) {
            console.error('❌ Webhook signature verification failed:', error);
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
                case 'payment_intent.succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;
                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                case 'charge.refunded':
                    await this.handleRefundProcessed(event.data.object);
                    break;
                default:
                    console.log('ℹ️ Unhandled webhook event type:', event.type);
            }

        } catch (error) {
            console.error('❌ Error handling webhook event:', error);
            throw error;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSucceeded(paymentIntent) {
        try {
            console.log('✅ Payment succeeded:', paymentIntent.id);
            
            const payrollId = paymentIntent.metadata.payroll_id;
            if (!payrollId) {
                console.log('⚠️ No payroll ID in payment metadata');
                return;
            }

            // Update payroll status to paid
            const { error: updateError } = await supabaseAdmin
                .from('payrolls')
                .update({
                    status: 'completed',
                    paid_at: new Date().toISOString(),
                    payment_reference: paymentIntent.id
                })
                .eq('id', payrollId);

            if (updateError) {
                console.error('❌ Error updating payroll status:', updateError);
            } else {
                console.log('✅ Payroll status updated to completed');
            }

        } catch (error) {
            console.error('❌ Error handling payment success:', error);
        }
    }

    /**
     * Handle failed payment
     */
    async handlePaymentFailed(paymentIntent) {
        try {
            console.log('❌ Payment failed:', paymentIntent.id);
            
            const payrollId = paymentIntent.metadata.payroll_id;
            if (!payrollId) {
                console.log('⚠️ No payroll ID in payment metadata');
                return;
            }

            // Update payroll status to failed
            const { error: updateError } = await supabaseAdmin
                .from('payrolls')
                .update({
                    status: 'failed',
                    notes: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`
                })
                .eq('id', payrollId);

            if (updateError) {
                console.error('❌ Error updating payroll status:', updateError);
            } else {
                console.log('✅ Payroll status updated to failed');
            }

        } catch (error) {
            console.error('❌ Error handling payment failure:', error);
        }
    }

    /**
     * Handle refund processed
     */
    async handleRefundProcessed(charge) {
        try {
            console.log('🔄 Refund processed:', charge.id);
            
            // You can add logic here to handle refunds
            // For example, update payroll status or create refund records
            
        } catch (error) {
            console.error('❌ Error handling refund:', error);
        }
    }
}

module.exports = new StripeService(); 