const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Running IBAN and Payment Fields Migration...');
    
    try {
        // For now, we'll just test the connection and show what needs to be done
        console.log('📝 Testing Supabase connection...');
        
        // Test the connection by trying to fetch a profile
        const { data: testProfile, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
            
        if (testError) {
            console.error('❌ Connection test failed:', testError);
            console.log('💡 Please run the following SQL manually in your Supabase dashboard:');
            console.log(`
-- Add IBAN and payment-related fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    stripe_payment_method_id VARCHAR(255) UNIQUE,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('card', 'bank_account', 'sepa_debit')),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_methods
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for stripe_customers
CREATE POLICY "Users can view their own stripe customer" ON stripe_customers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own stripe customer" ON stripe_customers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stripe customer" ON stripe_customers
    FOR UPDATE USING (user_id = auth.uid());
            `);
        } else {
            console.log('✅ Connection test successful');
            console.log('💡 The migration script is ready to run manually in Supabase dashboard');
            console.log('📋 Copy the SQL above and run it in your Supabase SQL editor');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration(); 