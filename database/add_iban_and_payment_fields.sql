-- Add IBAN, phone, and bio fields to profiles table
-- These fields will be used for payment information and user details

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS iban VARCHAR(34);

-- Add comments for documentation
COMMENT ON COLUMN profiles.phone IS 'User phone number for contact purposes';
COMMENT ON COLUMN profiles.bio IS 'User biography or description';
COMMENT ON COLUMN profiles.iban IS 'International Bank Account Number for payments';

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Create index on iban for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_iban ON profiles(iban);

-- Create payment_methods table for Stripe integration
CREATE TABLE payment_methods (
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

-- Create stripe_customers table to store Stripe customer IDs
CREATE TABLE stripe_customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_stripe_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for stripe_customers
CREATE POLICY "Users can view their own stripe customer" ON stripe_customers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own stripe customer" ON stripe_customers
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stripe customer" ON stripe_customers
    FOR UPDATE USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_customers_updated_at 
    BEFORE UPDATE ON stripe_customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add IBAN validation function
CREATE OR REPLACE FUNCTION validate_iban(iban_text VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic IBAN validation (length and format)
    -- This is a simplified validation - in production you'd want more comprehensive validation
    IF iban_text IS NULL OR LENGTH(iban_text) < 15 OR LENGTH(iban_text) > 34 THEN
        RETURN false;
    END IF;
    
    -- Check if it contains only alphanumeric characters
    IF iban_text !~ '^[A-Z0-9]+$' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint for IBAN validation
ALTER TABLE profiles 
ADD CONSTRAINT check_iban_format 
CHECK (iban IS NULL OR validate_iban(iban)); 