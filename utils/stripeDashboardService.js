const { supabase, supabaseAdmin } = require('../config/supabase');

class StripeDashboardService {
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
     * Get Stripe dashboard metrics for an organization
     */
    async getDashboardMetrics(organizationId, dateRange = '30d') {
        try {
            console.log('📊 Fetching Stripe dashboard metrics for organization:', organizationId);
            
            // Get organization's Stripe account
            const { data: organization, error: orgError } = await supabase
                .from('organizations')
                .select('stripe_account_id, stripe_dashboard_enabled')
                .eq('id', organizationId)
                .single();

            if (orgError || !organization) {
                throw new Error('Organization not found');
            }

            if (!organization.stripe_dashboard_enabled) {
                throw new Error('Stripe dashboard not enabled for this organization');
            }

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            
            switch (dateRange) {
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
                default:
                    startDate.setDate(endDate.getDate() - 30);
            }

            // Get metrics from database first
            const { data: dbMetrics, error: dbError } = await supabase
                .from('stripe_dashboard_metrics')
                .select('*')
                .eq('organization_id', organizationId)
                .gte('metric_date', startDate.toISOString().split('T')[0])
                .lte('metric_date', endDate.toISOString().split('T')[0])
                .order('metric_date', { ascending: true });

            if (dbError) {
                console.error('❌ Error fetching database metrics:', dbError);
            }

            // Get real-time data from Stripe if account is connected
            let stripeMetrics = null;
            if (organization.stripe_account_id) {
                try {
                    stripeMetrics = await this.getStripeRealTimeMetrics(
                        organization.stripe_account_id,
                        startDate,
                        endDate
                    );
                } catch (stripeError) {
                    console.error('❌ Error fetching Stripe metrics:', stripeError);
                }
            }

            // Combine database and Stripe metrics
            const combinedMetrics = this.combineMetrics(dbMetrics || [], stripeMetrics);

            return {
                success: true,
                metrics: combinedMetrics,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                },
                organization: {
                    stripe_enabled: organization.stripe_dashboard_enabled,
                    stripe_account_connected: !!organization.stripe_account_id
                }
            };

        } catch (error) {
            console.error('❌ Error in getDashboardMetrics:', error);
            throw error;
        }
    }

    /**
     * Get real-time metrics from Stripe API
     */
    async getStripeRealTimeMetrics(stripeAccountId, startDate, endDate) {
        try {
            console.log('🔄 Fetching real-time Stripe metrics for account:', stripeAccountId);

            // Get payment intents
            const paymentIntents = await this.stripe.paymentIntents.list({
                created: {
                    gte: Math.floor(startDate.getTime() / 1000),
                    lte: Math.floor(endDate.getTime() / 1000)
                },
                limit: 100
            }, {
                stripeAccount: stripeAccountId
            });

            // Get charges
            const charges = await this.stripe.charges.list({
                created: {
                    gte: Math.floor(startDate.getTime() / 1000),
                    lte: Math.floor(endDate.getTime() / 1000)
                },
                limit: 100
            }, {
                stripeAccount: stripeAccountId
            });

            // Calculate metrics
            const metrics = {
                total_revenue: 0,
                total_payments: paymentIntents.data.length,
                successful_payments: 0,
                failed_payments: 0,
                pending_payments: 0,
                average_payment_amount: 0,
                payment_methods: {},
                currency_breakdown: {}
            };

            let totalAmount = 0;
            let successfulAmount = 0;

            // Process payment intents
            paymentIntents.data.forEach(intent => {
                const amount = intent.amount / 100; // Convert from cents
                totalAmount += amount;

                switch (intent.status) {
                    case 'succeeded':
                        metrics.successful_payments++;
                        successfulAmount += amount;
                        break;
                    case 'failed':
                        metrics.failed_payments++;
                        break;
                    case 'processing':
                    case 'requires_payment_method':
                    case 'requires_confirmation':
                    case 'requires_action':
                        metrics.pending_payments++;
                        break;
                }

                // Track payment methods
                if (intent.payment_method_types && intent.payment_method_types.length > 0) {
                    const method = intent.payment_method_types[0];
                    metrics.payment_methods[method] = (metrics.payment_methods[method] || 0) + 1;
                }

                // Track currencies
                const currency = intent.currency.toUpperCase();
                metrics.currency_breakdown[currency] = (metrics.currency_breakdown[currency] || 0) + amount;
            });

            metrics.total_revenue = successfulAmount;
            metrics.average_payment_amount = metrics.successful_payments > 0 ? 
                successfulAmount / metrics.successful_payments : 0;

            return metrics;

        } catch (error) {
            console.error('❌ Error fetching Stripe real-time metrics:', error);
            throw error;
        }
    }

    /**
     * Combine database and Stripe metrics
     */
    combineMetrics(dbMetrics, stripeMetrics) {
        const combined = {
            total_revenue: 0,
            total_payments: 0,
            successful_payments: 0,
            failed_payments: 0,
            pending_payments: 0,
            average_payment_amount: 0,
            payment_methods: {},
            currency_breakdown: {},
            daily_breakdown: [],
            trends: {
                revenue_growth: 0,
                payment_growth: 0,
                success_rate: 0
            }
        };

        // Add database metrics
        if (dbMetrics && dbMetrics.length > 0) {
            dbMetrics.forEach(metric => {
                combined.total_revenue += parseFloat(metric.total_revenue || 0);
                combined.total_payments += parseInt(metric.total_payments || 0);
                combined.successful_payments += parseInt(metric.successful_payments || 0);
                combined.failed_payments += parseInt(metric.failed_payments || 0);

                // Add daily breakdown
                combined.daily_breakdown.push({
                    date: metric.metric_date,
                    revenue: parseFloat(metric.total_revenue || 0),
                    payments: parseInt(metric.total_payments || 0),
                    successful: parseInt(metric.successful_payments || 0),
                    failed: parseInt(metric.failed_payments || 0)
                });
            });
        }

        // Add Stripe real-time metrics
        if (stripeMetrics) {
            combined.total_revenue += parseFloat(stripeMetrics.total_revenue || 0);
            combined.total_payments += parseInt(stripeMetrics.total_payments || 0);
            combined.successful_payments += parseInt(stripeMetrics.successful_payments || 0);
            combined.failed_payments += parseInt(stripeMetrics.failed_payments || 0);
            combined.pending_payments = parseInt(stripeMetrics.pending_payments || 0);

            // Merge payment methods
            Object.assign(combined.payment_methods, stripeMetrics.payment_methods || {});

            // Merge currency breakdown
            Object.assign(combined.currency_breakdown, stripeMetrics.currency_breakdown || {});
        }

        // Calculate averages and trends
        combined.average_payment_amount = combined.successful_payments > 0 ? 
            combined.total_revenue / combined.successful_payments : 0;

        combined.trends.success_rate = combined.total_payments > 0 ? 
            (combined.successful_payments / combined.total_payments) * 100 : 0;

        // Calculate growth trends (simplified)
        if (combined.daily_breakdown.length >= 2) {
            const recent = combined.daily_breakdown.slice(-7);
            const previous = combined.daily_breakdown.slice(-14, -7);
            
            const recentRevenue = recent.reduce((sum, day) => sum + day.revenue, 0);
            const previousRevenue = previous.reduce((sum, day) => sum + day.revenue, 0);
            
            combined.trends.revenue_growth = previousRevenue > 0 ? 
                ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
        }

        return combined;
    }

    /**
     * Sync payment analytics to database
     */
    async syncPaymentAnalytics(organizationId, paymentIntent) {
        try {
            console.log('🔄 Syncing payment analytics for organization:', organizationId);

            const analyticsData = {
                organization_id: organizationId,
                payment_intent_id: paymentIntent.id,
                amount: paymentIntent.amount / 100, // Convert from cents
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                payment_method_type: paymentIntent.payment_method_types?.[0] || 'unknown',
                payment_method_details: paymentIntent.payment_method_types,
                customer_id: paymentIntent.customer,
                metadata: paymentIntent.metadata,
                created_at: new Date(paymentIntent.created * 1000).toISOString()
            };

            // Get customer details if available
            if (paymentIntent.customer) {
                try {
                    const customer = await this.stripe.customers.retrieve(paymentIntent.customer);
                    analyticsData.customer_email = customer.email;
                    analyticsData.customer_name = customer.name;
                } catch (customerError) {
                    console.warn('⚠️ Could not fetch customer details:', customerError.message);
                }
            }

            // Insert or update analytics record
            const { error: insertError } = await supabaseAdmin
                .from('stripe_payment_analytics')
                .upsert(analyticsData, { 
                    onConflict: 'payment_intent_id',
                    ignoreDuplicates: false 
                });

            if (insertError) {
                console.error('❌ Error syncing payment analytics:', insertError);
                throw insertError;
            }

            console.log('✅ Payment analytics synced successfully');
            return true;

        } catch (error) {
            console.error('❌ Error in syncPaymentAnalytics:', error);
            throw error;
        }
    }

    /**
     * Get payment analytics for an organization
     */
    async getPaymentAnalytics(organizationId, limit = 50, offset = 0) {
        try {
            console.log('📈 Fetching payment analytics for organization:', organizationId);

            const { data: analytics, error } = await supabase
                .from('stripe_payment_analytics')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('❌ Error fetching payment analytics:', error);
                throw error;
            }

            return {
                success: true,
                analytics: analytics || [],
                pagination: {
                    limit,
                    offset,
                    hasMore: analytics && analytics.length === limit
                }
            };

        } catch (error) {
            console.error('❌ Error in getPaymentAnalytics:', error);
            throw error;
        }
    }

    /**
     * Enable Stripe dashboard for an organization
     */
    async enableStripeDashboard(organizationId, stripeAccountId = null) {
        try {
            console.log('🔧 Enabling Stripe dashboard for organization:', organizationId);

            const updateData = {
                stripe_dashboard_enabled: true,
                updated_at: new Date().toISOString()
            };

            if (stripeAccountId) {
                updateData.stripe_account_id = stripeAccountId;
                updateData.stripe_connect_enabled = true;
            }

            const { error } = await supabaseAdmin
                .from('organizations')
                .update(updateData)
                .eq('id', organizationId);

            if (error) {
                console.error('❌ Error enabling Stripe dashboard:', error);
                throw error;
            }

            // Enable dashboard access for admin users
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    stripe_dashboard_access: true,
                    updated_at: new Date().toISOString()
                })
                .eq('organization_id', organizationId)
                .in('role', ['admin', 'super_admin']);

            if (profileError) {
                console.error('❌ Error updating admin profiles:', profileError);
            }

            console.log('✅ Stripe dashboard enabled successfully');
            return true;

        } catch (error) {
            console.error('❌ Error in enableStripeDashboard:', error);
            throw error;
        }
    }

    /**
     * Disable Stripe dashboard for an organization
     */
    async disableStripeDashboard(organizationId) {
        try {
            console.log('🔧 Disabling Stripe dashboard for organization:', organizationId);

            const { error } = await supabaseAdmin
                .from('organizations')
                .update({
                    stripe_dashboard_enabled: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', organizationId);

            if (error) {
                console.error('❌ Error disabling Stripe dashboard:', error);
                throw error;
            }

            // Disable dashboard access for users
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    stripe_dashboard_access: false,
                    updated_at: new Date().toISOString()
                })
                .eq('organization_id', organizationId);

            if (profileError) {
                console.error('❌ Error updating user profiles:', profileError);
            }

            console.log('✅ Stripe dashboard disabled successfully');
            return true;

        } catch (error) {
            console.error('❌ Error in disableStripeDashboard:', error);
            throw error;
        }
    }

    /**
     * Get Stripe Connect account status
     */
    async getStripeAccountStatus(organizationId) {
        try {
            console.log('🔍 Checking Stripe account status for organization:', organizationId);

            const { data: organization, error } = await supabase
                .from('organizations')
                .select('stripe_account_id, stripe_connect_enabled')
                .eq('id', organizationId)
                .single();

            if (error || !organization) {
                throw new Error('Organization not found');
            }

            if (!organization.stripe_account_id) {
                return {
                    connected: false,
                    account_id: null,
                    status: 'not_connected'
                };
            }

            // Get account details from Stripe
            const account = await this.stripe.accounts.retrieve(organization.stripe_account_id);

            return {
                connected: true,
                account_id: organization.stripe_account_id,
                status: account.charges_enabled ? 'active' : 'pending',
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                requirements: account.requirements,
                business_type: account.business_type,
                country: account.country
            };

        } catch (error) {
            console.error('❌ Error in getStripeAccountStatus:', error);
            throw error;
        }
    }
}

module.exports = StripeDashboardService; 