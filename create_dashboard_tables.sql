-- Dashboard Schema
-- Run this in your Supabase SQL Editor

-- Create dashboard table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dashboard_widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    config JSONB DEFAULT '{}',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dashboards_organization_id ON dashboards(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboards_slug ON dashboards(slug);
CREATE INDEX IF NOT EXISTS idx_dashboards_is_default ON dashboards(is_default);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_order_index ON dashboard_widgets(order_index);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(type);

-- Enable Row Level Security (RLS)
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboards
CREATE POLICY "Super admin can access all dashboards" ON dashboards
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view dashboards in their organization" ON dashboards
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage dashboards in their organization" ON dashboards
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for dashboard_widgets
CREATE POLICY "Super admin can access all dashboard widgets" ON dashboard_widgets
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view widgets in their organization dashboards" ON dashboard_widgets
    FOR SELECT USING (
        dashboard_id IN (
            SELECT d.id FROM dashboards d
            JOIN profiles p ON d.organization_id = p.organization_id
            WHERE p.id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage widgets in their organization dashboards" ON dashboard_widgets
    FOR ALL USING (
        dashboard_id IN (
            SELECT d.id FROM dashboards d
            JOIN profiles p ON d.organization_id = p.organization_id
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_dashboards_updated_at 
    BEFORE UPDATE ON dashboards 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_widgets_updated_at 
    BEFORE UPDATE ON dashboard_widgets 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

-- Create unique constraint to ensure only one default dashboard per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboards_org_default 
    ON dashboards(organization_id) 
    WHERE is_default = true; 