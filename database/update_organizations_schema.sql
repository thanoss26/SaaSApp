-- Migration: Add admin-only fields to organizations table
-- Run this in your Supabase SQL Editor

-- Add new columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS total_employees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS job_applicants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_report DECIMAL(5,2) DEFAULT 0.00, -- Percentage (0-100)
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_total_employees ON organizations(total_employees);
CREATE INDEX IF NOT EXISTS idx_organizations_total_revenue ON organizations(total_revenue);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- Update existing organizations to have default values if they don't exist
UPDATE organizations 
SET 
    total_employees = 0,
    job_applicants = 0,
    attendance_report = 0.00,
    total_revenue = 0.00,
    tasks = 0,
    is_active = true
WHERE total_employees IS NULL 
   OR job_applicants IS NULL 
   OR attendance_report IS NULL 
   OR total_revenue IS NULL 
   OR tasks IS NULL 
   OR is_active IS NULL;

-- Create a view for admin-only organization data
CREATE OR REPLACE VIEW organizations_admin_view AS
SELECT 
    o.*,
    COUNT(DISTINCT p.id) as actual_employee_count,
    COUNT(DISTINCT t.id) as team_count
FROM organizations o
LEFT JOIN profiles p ON o.id = p.organization_id AND p.is_active = true
LEFT JOIN teams t ON o.id = t.organization_id
GROUP BY o.id;

-- Grant access to the view for authenticated users
GRANT SELECT ON organizations_admin_view TO authenticated;

-- Add RLS policy for admin-only access to sensitive fields
CREATE POLICY "Admin can view all organization data" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'super_admin')
        )
    );

-- Add comment to document the new fields
COMMENT ON COLUMN organizations.total_employees IS 'Admin-only: Total number of employees in the organization';
COMMENT ON COLUMN organizations.job_applicants IS 'Admin-only: Number of job applicants';
COMMENT ON COLUMN organizations.attendance_report IS 'Admin-only: Attendance percentage (0-100)';
COMMENT ON COLUMN organizations.total_revenue IS 'Admin-only: Total revenue in USD';
COMMENT ON COLUMN organizations.tasks IS 'Admin-only: Number of tasks/projects'; 