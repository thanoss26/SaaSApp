require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSubscriptionTables() {
    try {
        console.log('📋 Creating subscription tables...');
        
        // Create stripe_customers table
        console.log('🔧 Creating stripe_customers table...');
        const { error: customersError } = await supabase
            .from('stripe_customers')
            .select('*')
            .limit(1);
        
        if (customersError && customersError.code === 'PGRST116') {
            // Table doesn't exist, create it
            const createCustomersSQL = `
                CREATE TABLE stripe_customers (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    stripe_customer_id TEXT UNIQUE NOT NULL,
                    email TEXT NOT NULL,
                    name TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;
            
            // We'll need to run this in the Supabase dashboard or use a different approach
            console.log('⚠️ Please create the stripe_customers table manually in your Supabase dashboard with the following SQL:');
            console.log(createCustomersSQL);
        } else {
            console.log('✅ stripe_customers table already exists');
        }
        
        // Create user_subscriptions table
        console.log('🔧 Creating user_subscriptions table...');
        const { error: subscriptionsError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .limit(1);
        
        if (subscriptionsError && subscriptionsError.code === 'PGRST116') {
            const createSubscriptionsSQL = `
                CREATE TABLE user_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    stripe_subscription_id TEXT UNIQUE NOT NULL,
                    stripe_customer_id TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'incomplete',
                    price_id TEXT NOT NULL,
                    current_period_start TIMESTAMP WITH TIME ZONE,
                    current_period_end TIMESTAMP WITH TIME ZONE,
                    cancel_at_period_end BOOLEAN DEFAULT FALSE,
                    cancelled_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;
            
            console.log('⚠️ Please create the user_subscriptions table manually in your Supabase dashboard with the following SQL:');
            console.log(createSubscriptionsSQL);
        } else {
            console.log('✅ user_subscriptions table already exists');
        }
        
        // Create subscription_payments table
        console.log('🔧 Creating subscription_payments table...');
        const { error: paymentsError } = await supabase
            .from('subscription_payments')
            .select('*')
            .limit(1);
        
        if (paymentsError && paymentsError.code === 'PGRST116') {
            const createPaymentsSQL = `
                CREATE TABLE subscription_payments (
                    id SERIAL PRIMARY KEY,
                    stripe_invoice_id TEXT UNIQUE NOT NULL,
                    stripe_subscription_id TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'eur',
                    status TEXT NOT NULL,
                    failure_reason TEXT,
                    paid_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `;
            
            console.log('⚠️ Please create the subscription_payments table manually in your Supabase dashboard with the following SQL:');
            console.log(createPaymentsSQL);
        } else {
            console.log('✅ subscription_payments table already exists');
        }
        
        console.log('✅ Subscription tables check completed!');
        console.log('📝 Please run the SQL statements above in your Supabase dashboard SQL editor if tables don\'t exist.');
        
    } catch (error) {
        console.error('❌ Error creating subscription tables:', error);
    }
}

createSubscriptionTables(); 