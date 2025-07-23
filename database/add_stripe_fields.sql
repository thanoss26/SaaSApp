-- Add Stripe-related fields to profiles table
-- This migration adds fields needed for Stripe integration

-- Add Stripe customer ID field
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_api_key VARCHAR(255);

-- Add index for Stripe customer ID for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN profiles.stripe_enabled IS 'Whether Stripe integration is enabled for this user';
COMMENT ON COLUMN profiles.stripe_api_key IS 'Stripe API key for this user (encrypted in production)';

-- Add Stripe-related fields to payrolls table
ALTER TABLE payrolls 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);

-- Add indexes for Stripe fields in payrolls
CREATE INDEX IF NOT EXISTS idx_payrolls_stripe_payment_intent_id ON payrolls(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_stripe_charge_id ON payrolls(stripe_charge_id);

-- Add comments for payrolls Stripe fields
COMMENT ON COLUMN payrolls.stripe_payment_intent_id IS 'Stripe payment intent ID for this payroll';
COMMENT ON COLUMN payrolls.stripe_charge_id IS 'Stripe charge ID for this payroll';

-- Create payments table for tracking Stripe payments
CREATE TABLE IF NOT EXISTS stripe_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_charge_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'eur',
    status VARCHAR(50) NOT NULL,
    payment_method_id VARCHAR(255),
    customer_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for stripe_payments table
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payroll_id ON stripe_payments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payment_intent_id ON stripe_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_customer_id ON stripe_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_created_at ON stripe_payments(created_at);

-- Enable RLS on stripe_payments table
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for stripe_payments
-- Users can view payments for payrolls in their organization
CREATE POLICY "Users can view stripe payments for their organization" ON stripe_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payrolls p
            JOIN profiles prof ON p.organization_id = prof.organization_id
            WHERE p.id = stripe_payments.payroll_id
            AND prof.id = auth.uid()
        )
    );

-- Admins can create payments for their organization
CREATE POLICY "Admins can create stripe payments" ON stripe_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles prof
            WHERE prof.id = auth.uid()
            AND prof.role IN ('admin', 'super_admin')
            AND EXISTS (
                SELECT 1 FROM payrolls p
                WHERE p.id = stripe_payments.payroll_id
                AND p.organization_id = prof.organization_id
            )
        )
    );

-- Admins can update payments for their organization
CREATE POLICY "Admins can update stripe payments" ON stripe_payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles prof
            WHERE prof.id = auth.uid()
            AND prof.role IN ('admin', 'super_admin')
            AND EXISTS (
                SELECT 1 FROM payrolls p
                WHERE p.id = stripe_payments.payroll_id
                AND p.organization_id = prof.organization_id
            )
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_stripe_payments_updated_at
    BEFORE UPDATE ON stripe_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_stripe_payments_updated_at(); 