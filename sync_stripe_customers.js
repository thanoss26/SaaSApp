require('dotenv').config();
const Stripe = require('stripe');
const { supabaseAdmin } = require('./config/supabase');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function syncStripeCustomers() {
    console.log('🔄 Starting Stripe customer sync to Supabase...');
    
    try {
        // Fetch all customers from Stripe
        console.log('📥 Fetching customers from Stripe...');
        const customers = [];
        let hasMore = true;
        let startingAfter = null;
        
        while (hasMore) {
            const params = { limit: 100 };
            if (startingAfter) {
                params.starting_after = startingAfter;
            }
            
            const response = await stripe.customers.list(params);
            customers.push(...response.data);
            
            hasMore = response.has_more;
            if (response.data.length > 0) {
                startingAfter = response.data[response.data.length - 1].id;
            }
        }
        
        console.log(`✅ Found ${customers.length} customers in Stripe`);
        
        // Process each customer
        let syncedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const customer of customers) {
            try {
                console.log(`🔄 Processing customer: ${customer.email} (${customer.id})`);
                
                // Check if user exists in Supabase
                const { data: existingUser, error: fetchError } = await supabaseAdmin
                    .from('users')
                    .select('id, email, stripe_customer_id')
                    .eq('email', customer.email)
                    .single();
                
                if (fetchError && fetchError.code !== 'PGRST116') {
                    console.log(`❌ Error fetching user ${customer.email}:`, fetchError.message);
                    errorCount++;
                    continue;
                }
                
                if (existingUser) {
                    // User exists, update stripe_customer_id if needed
                    if (!existingUser.stripe_customer_id) {
                        const { error: updateError } = await supabaseAdmin
                            .from('users')
                            .update({ 
                                stripe_customer_id: customer.id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingUser.id);
                        
                        if (updateError) {
                            console.log(`❌ Error updating user ${customer.email}:`, updateError.message);
                            errorCount++;
                        } else {
                            console.log(`✅ Updated user ${customer.email} with Stripe customer ID`);
                            updatedCount++;
                        }
                    } else {
                        console.log(`ℹ️ User ${customer.email} already has Stripe customer ID`);
                    }
                } else {
                    // User doesn't exist, create new user
                    const { error: insertError } = await supabaseAdmin
                        .from('users')
                        .insert({
                            email: customer.email,
                            first_name: customer.name ? customer.name.split(' ')[0] : null,
                            last_name: customer.name ? customer.name.split(' ').slice(1).join(' ') : null,
                            stripe_customer_id: customer.id,
                            role: 'user',
                            is_active: true,
                            created_at: new Date(customer.created * 1000).toISOString(),
                            updated_at: new Date().toISOString()
                        });
                    
                    if (insertError) {
                        console.log(`❌ Error creating user ${customer.email}:`, insertError.message);
                        errorCount++;
                    } else {
                        console.log(`✅ Created new user ${customer.email}`);
                        syncedCount++;
                    }
                }
                
                // Also sync subscriptions if customer has any
                await syncCustomerSubscriptions(customer);
                
            } catch (error) {
                console.log(`❌ Error processing customer ${customer.email}:`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n📊 Sync Summary:');
        console.log(`✅ New users created: ${syncedCount}`);
        console.log(`🔄 Existing users updated: ${updatedCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📈 Total customers processed: ${customers.length}`);
        
    } catch (error) {
        console.error('❌ Error syncing Stripe customers:', error);
    }
}

async function syncCustomerSubscriptions(customer) {
    try {
        console.log(`📋 Syncing subscriptions for customer: ${customer.email}`);
        
        // Fetch customer's subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 100
        });
        
        console.log(`📥 Found ${subscriptions.data.length} subscriptions for ${customer.email}`);
        
        for (const subscription of subscriptions.data) {
            try {
                // Get the user ID for this customer
                const { data: user, error: userError } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('stripe_customer_id', customer.id)
                    .single();
                
                if (userError || !user) {
                    console.log(`⚠️ User not found for customer ${customer.id}, skipping subscription`);
                    continue;
                }
                
                // Check if subscription already exists
                const { data: existingSub, error: subError } = await supabaseAdmin
                    .from('subscriptions')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();
                
                if (existingSub) {
                    console.log(`ℹ️ Subscription ${subscription.id} already exists for ${customer.email}`);
                    continue;
                }
                
                // Determine plan name from price ID
                const planName = getPlanNameFromPriceId(subscription.items.data[0].price.id);
                
                // Create subscription record
                const { error: insertError } = await supabaseAdmin
                    .from('subscriptions')
                    .insert({
                        user_id: user.id,
                        stripe_subscription_id: subscription.id,
                        plan_name: planName,
                        price_id: subscription.items.data[0].price.id,
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        created_at: new Date(subscription.created * 1000).toISOString(),
                        updated_at: new Date().toISOString()
                    });
                
                if (insertError) {
                    console.log(`❌ Error creating subscription for ${customer.email}:`, insertError.message);
                } else {
                    console.log(`✅ Created subscription ${subscription.id} for ${customer.email}`);
                }
                
            } catch (error) {
                console.log(`❌ Error processing subscription for ${customer.email}:`, error.message);
            }
        }
        
    } catch (error) {
        console.log(`❌ Error syncing subscriptions for ${customer.email}:`, error.message);
    }
}

function getPlanNameFromPriceId(priceId) {
    // Map your Stripe price IDs to plan names
    const priceIdMap = {
        [process.env.STRIPE_STARTER_MONTHLY]: 'starter',
        [process.env.STRIPE_STARTER_ANNUAL]: 'starter',
        [process.env.STRIPE_PROFESSIONAL_MONTHLY]: 'professional',
        [process.env.STRIPE_PROFESSIONAL_ANNUAL]: 'professional',
        [process.env.STRIPE_ENTERPRISE_MONTHLY]: 'enterprise',
        [process.env.STRIPE_ENTERPRISE_ANNUAL]: 'enterprise',
        [process.env.FREE_PLAN]: 'free'
    };
    
    return priceIdMap[priceId] || 'unknown';
}

// Run the sync
if (require.main === module) {
    syncStripeCustomers()
        .then(() => {
            console.log('✅ Stripe customer sync completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Sync failed:', error);
            process.exit(1);
        });
}

module.exports = { syncStripeCustomers }; 