-- Clear existing payroll data and prepare for Stripe dashboard integration
-- This script removes all existing payroll data and sets up the system for Stripe integration

-- 1. Clear existing payroll data
DELETE FROM stripe_payments;
DELETE FROM payments;
DELETE FROM payrolls;

-- 2. Reset auto-increment sequences if any
-- Note: PostgreSQL uses UUIDs, so no sequences to reset

-- 3. Add Stripe dashboard integration fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_dashboard_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_connect_enabled BOOLEAN DEFAULT false;

-- 4. Add Stripe dashboard fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_dashboard_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_account_type VARCHAR(50) DEFAULT 'standard' CHECK (stripe_account_type IN ('standard', 'express', 'custom')),
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_requirements JSONB;

-- 5. Create Stripe dashboard metrics table
CREATE TABLE IF NOT EXISTS stripe_dashboard_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    metric_date DATE NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_payments INTEGER DEFAULT 0,
    successful_payments INTEGER DEFAULT 0,
    failed_payments INTEGER DEFAULT 0,
    refunded_amount DECIMAL(15,2) DEFAULT 0,
    pending_amount DECIMAL(15,2) DEFAULT 0,
    average_payment_amount DECIMAL(10,2) DEFAULT 0,
    payment_methods_used JSONB,
    currency_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, metric_date)
);

-- 6. Create Stripe payment analytics table
CREATE TABLE IF NOT EXISTS stripe_payment_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'eur',
    status VARCHAR(50) NOT NULL,
    payment_method_type VARCHAR(50),
    payment_method_details JSONB,
    customer_id VARCHAR(255),
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_dashboard_metrics_org_date ON stripe_dashboard_metrics(organization_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_analytics_org_id ON stripe_payment_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_analytics_status ON stripe_payment_analytics(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_analytics_created_at ON stripe_payment_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account_id ON organizations(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_dashboard_access ON profiles(stripe_dashboard_access);

-- 8. Enable RLS on new tables
ALTER TABLE stripe_dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payment_analytics ENABLE ROW LEVEL SECURITY;

-- 9. RLS policies for stripe_dashboard_metrics
CREATE POLICY "Users can view dashboard metrics for their organization" ON stripe_dashboard_metrics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage dashboard metrics for their organization" ON stripe_dashboard_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND organization_id = stripe_dashboard_metrics.organization_id
        )
    );

-- 10. RLS policies for stripe_payment_analytics
CREATE POLICY "Users can view payment analytics for their organization" ON stripe_payment_analytics
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage payment analytics for their organization" ON stripe_payment_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
            AND organization_id = stripe_payment_analytics.organization_id
        )
    );

-- 11. Add comments for documentation
COMMENT ON TABLE stripe_dashboard_metrics IS 'Stripe dashboard metrics and analytics data';
COMMENT ON TABLE stripe_payment_analytics IS 'Detailed Stripe payment analytics and tracking';
COMMENT ON COLUMN organizations.stripe_account_id IS 'Stripe Connect account ID for the organization';
COMMENT ON COLUMN organizations.stripe_dashboard_enabled IS 'Whether Stripe dashboard integration is enabled';
COMMENT ON COLUMN profiles.stripe_dashboard_access IS 'Whether user has access to Stripe dashboard features';
COMMENT ON COLUMN profiles.stripe_account_type IS 'Type of Stripe account (standard, express, custom)';

-- 12. Create function to update dashboard metrics
CREATE OR REPLACE FUNCTION update_stripe_dashboard_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update metrics when payment analytics are inserted/updated
    INSERT INTO stripe_dashboard_metrics (
        organization_id, 
        metric_date, 
        total_revenue, 
        total_payments, 
        successful_payments,
        failed_payments,
        average_payment_amount
    )
    SELECT 
        NEW.organization_id,
        DATE(NEW.created_at),
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0),
        COUNT(*),
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END),
        COUNT(CASE WHEN status = 'failed' THEN 1 END),
        COALESCE(AVG(amount), 0)
    FROM stripe_payment_analytics
    WHERE organization_id = NEW.organization_id 
    AND DATE(created_at) = DATE(NEW.created_at)
    ON CONFLICT (organization_id, metric_date) 
    DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_payments = EXCLUDED.total_payments,
        successful_payments = EXCLUDED.successful_payments,
        failed_payments = EXCLUDED.failed_payments,
        average_payment_amount = EXCLUDED.average_payment_amount,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 13. Create trigger for automatic metrics updates
CREATE TRIGGER trigger_update_stripe_dashboard_metrics
    AFTER INSERT OR UPDATE ON stripe_payment_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_stripe_dashboard_metrics();

-- 14. Insert sample dashboard configuration (optional)
-- This can be used to test the dashboard integration
INSERT INTO organizations (id, name, stripe_dashboard_enabled, stripe_connect_enabled)
VALUES 
    ('518fe5ae-2c39-46c6-8cbe-171167d07ff3', 'Sample Organization', true, true)
ON CONFLICT (id) DO UPDATE SET
    stripe_dashboard_enabled = true,
    stripe_connect_enabled = true;

-- 15. Update existing profiles to enable Stripe dashboard access for admins
UPDATE profiles 
SET stripe_dashboard_access = true
WHERE role IN ('admin', 'super_admin') 
AND organization_id IS NOT NULL;

-- Success message
SELECT 'Payroll data cleared and Stripe dashboard integration prepared successfully!' as status; 