-- Payments table for storing payment records
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    payment_reference VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'revolut', 'paypal')),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
    card_last4 VARCHAR(4), -- Last 4 digits of card (for card payments)
    bank_reference VARCHAR(100), -- Bank transfer reference
    external_payment_id VARCHAR(100), -- External payment processor ID
    processed_by UUID NOT NULL REFERENCES profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_payroll_id ON payments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_processed_by ON payments(processed_by);
CREATE INDEX IF NOT EXISTS idx_payments_processed_at ON payments(processed_at);

-- RLS Policies for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payments for payrolls in their organization
CREATE POLICY "Users can view payments for their organization" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payrolls p
            JOIN profiles prof ON p.organization_id = prof.organization_id
            WHERE p.id = payments.payroll_id
            AND prof.id = auth.uid()
        )
    );

-- Policy: Admins can create payments for their organization
CREATE POLICY "Admins can create payments" ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles prof
            WHERE prof.id = auth.uid()
            AND prof.role IN ('admin', 'super_admin')
            AND EXISTS (
                SELECT 1 FROM payrolls p
                WHERE p.id = payments.payroll_id
                AND p.organization_id = prof.organization_id
            )
        )
    );

-- Policy: Admins can update payments for their organization
CREATE POLICY "Admins can update payments" ON payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles prof
            WHERE prof.id = auth.uid()
            AND prof.role IN ('admin', 'super_admin')
            AND EXISTS (
                SELECT 1 FROM payrolls p
                WHERE p.id = payments.payroll_id
                AND p.organization_id = prof.organization_id
            )
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Add paid_at column to payrolls table if it doesn't exist
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(50);

-- Add index for paid_at
CREATE INDEX IF NOT EXISTS idx_payrolls_paid_at ON payrolls(paid_at);
CREATE INDEX IF NOT EXISTS idx_payrolls_payment_reference ON payrolls(payment_reference); 