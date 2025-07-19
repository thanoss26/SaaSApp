-- Corrected Organizations Schema
-- This schema works with the existing organizations table structure
-- Only uses columns that actually exist: id, name, join_code, created_at, updated_at

-- First, let's clean up any problematic data or structures
DROP VIEW IF EXISTS organization_stats;
DROP TRIGGER IF EXISTS trigger_update_org_metrics_on_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON organizations;
DROP FUNCTION IF EXISTS trigger_update_org_metrics();
DROP FUNCTION IF EXISTS generate_organization_join_code();
DROP FUNCTION IF EXISTS update_organizations_updated_at();

-- Verify the current organizations table structure
-- It should only have: id, name, join_code, created_at, updated_at

-- Insert sample organizations with ONLY existing columns
-- Using 6-character join codes to match VARCHAR(6) constraint
INSERT INTO organizations (
    id,
    name,
    join_code
) VALUES 
(
    '39656808-1b77-413d-9c83-81b69556cde5',
    'Immortal Hollow',
    'IH2024'
),
(
    '518fe5ae-2c39-46c6-8cbe-171167d07ff3',
    'Tech Solutions Pro',
    'TSP2024'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    join_code = EXCLUDED.join_code,
    updated_at = NOW();

-- Create a simple view for organization statistics using only existing columns
CREATE OR REPLACE VIEW organization_stats AS
SELECT 
    o.id,
    o.name,
    o.join_code,
    COUNT(p.id) as actual_employee_count,
    COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_employees,
    COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN p.role = 'organization_member' THEN 1 END) as member_count,
    o.created_at,
    o.updated_at
FROM organizations o
LEFT JOIN profiles p ON o.id = p.organization_id
GROUP BY o.id, o.name, o.join_code, o.created_at, o.updated_at;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT SELECT ON organization_stats TO authenticated;

-- Create RLS policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view organizations they belong to
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Admins and super_admins can view all organizations
CREATE POLICY "Admins can view all organizations" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Organization admins can update their organization
CREATE POLICY "Organization admins can update" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND organization_id = organizations.id 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Super admins can update any organization
CREATE POLICY "Super admins can update any organization" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Policy: Only super admins can delete organizations
CREATE POLICY "Only super admins can delete organizations" ON organizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Policy: Admins and super_admins can create organizations
CREATE POLICY "Admins can create organizations" ON organizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    ); 