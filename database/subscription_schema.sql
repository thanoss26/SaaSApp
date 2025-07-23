-- Stripe Customers Table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
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

-- Subscription Payments Table
CREATE TABLE IF NOT EXISTS subscription_payments (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON subscription_payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_invoice_id ON subscription_payments(stripe_invoice_id);

-- Enable Row Level Security
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
CREATE POLICY "Users can view their own customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer data" ON stripe_customers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer data" ON stripe_customers
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for subscription_payments
CREATE POLICY "Users can view payments for their subscriptions" ON subscription_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions 
            WHERE user_subscriptions.stripe_subscription_id = subscription_payments.stripe_subscription_id 
            AND user_subscriptions.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_stripe_customers_updated_at 
    BEFORE UPDATE ON stripe_customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION get_user_subscription(user_uuid UUID)
RETURNS TABLE (
    subscription_id TEXT,
    status TEXT,
    price_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.stripe_subscription_id,
        us.status,
        us.price_id,
        us.current_period_start,
        us.current_period_end,
        us.cancel_at_period_end
    FROM user_subscriptions us
    WHERE us.user_id = user_uuid
    AND us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO subscription_count
    FROM user_subscriptions
    WHERE user_id = user_uuid
    AND status IN ('active', 'trialing')
    AND (cancel_at_period_end = FALSE OR current_period_end > NOW());
    
    RETURN subscription_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 