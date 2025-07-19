-- Improved Organizations Schema
-- This schema provides better data handling and more comprehensive organization information

-- Drop existing organizations table if it exists (be careful in production!)
-- DROP TABLE IF EXISTS organizations CASCADE;

-- Create improved organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    size VARCHAR(50) CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Organization settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Business information
    founded_date DATE,
    business_type VARCHAR(100),
    tax_id VARCHAR(100),
    
    -- Status and visibility
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    join_code VARCHAR(20) UNIQUE,
    
    -- Metrics and analytics (can be updated via triggers or application logic)
    total_employees INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    job_applicants INTEGER DEFAULT 0,
    attendance_report DECIMAL(5,2) DEFAULT 0.00, -- percentage
    tasks INTEGER DEFAULT 0,
    
    -- Social media and branding
    logo_url TEXT,
    banner_url TEXT,
    social_media JSONB DEFAULT '{}',
    
    -- Settings and preferences
    settings JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_website CHECK (website IS NULL OR website ~ '^https?://'),
    CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^[+]?[0-9\s\-\(\)]+$')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry);
CREATE INDEX IF NOT EXISTS idx_organizations_size ON organizations(size);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);
CREATE INDEX IF NOT EXISTS idx_organizations_join_code ON organizations(join_code);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();

-- Create a function to generate unique join codes
CREATE OR REPLACE FUNCTION generate_organization_join_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    join_code VARCHAR(20);
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate a random 8-character code
        join_code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if it already exists
        IF NOT EXISTS (SELECT 1 FROM organizations WHERE join_code = join_code) THEN
            RETURN join_code;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique join code after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update organization metrics
CREATE OR REPLACE FUNCTION update_organization_metrics(org_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update total employees count
    UPDATE organizations 
    SET total_employees = (
        SELECT COUNT(*) 
        FROM profiles 
        WHERE organization_id = org_id AND is_active = true
    )
    WHERE id = org_id;
    
    -- Update other metrics as needed
    -- This can be expanded based on your specific needs
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update metrics when profiles change
CREATE OR REPLACE FUNCTION trigger_update_org_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_organization_metrics(NEW.organization_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
            -- User moved to different organization
            IF OLD.organization_id IS NOT NULL THEN
                PERFORM update_organization_metrics(OLD.organization_id);
            END IF;
            IF NEW.organization_id IS NOT NULL THEN
                PERFORM update_organization_metrics(NEW.organization_id);
            END IF;
        ELSE
            -- User updated within same organization
            PERFORM update_organization_metrics(NEW.organization_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.organization_id IS NOT NULL THEN
            PERFORM update_organization_metrics(OLD.organization_id);
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS trigger_update_org_metrics_on_profiles ON profiles;
CREATE TRIGGER trigger_update_org_metrics_on_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_org_metrics();

-- Insert sample organizations with improved data
INSERT INTO organizations (
    id,
    name,
    description,
    industry,
    size,
    website,
    address,
    city,
    state,
    country,
    postal_code,
    phone,
    email,
    timezone,
    currency,
    language,
    founded_date,
    business_type,
    is_active,
    is_public,
    join_code,
    total_employees,
    total_revenue,
    job_applicants,
    attendance_report,
    tasks,
    social_media,
    settings,
    features,
    created_by
) VALUES 
(
    '39656808-1b77-413d-9c83-81b69556cde5',
    'Immortal Hollow',
    'A dynamic technology company focused on innovative solutions and cutting-edge development.',
    'Technology',
    'medium',
    'https://immortalhollow.com',
    '123 Innovation Drive',
    'San Francisco',
    'CA',
    'USA',
    '94105',
    '+1-555-0123',
    'contact@immortalhollow.com',
    'America/Los_Angeles',
    'USD',
    'en',
    '2020-01-15',
    'Corporation',
    true,
    true,
    'IH2024',
    25,
    2500000.00,
    15,
    95.50,
    150,
    '{"linkedin": "https://linkedin.com/company/immortalhollow", "twitter": "https://twitter.com/immortalhollow"}',
    '{"notifications": {"email": true, "push": true}, "privacy": {"public_profile": true}}',
    '{"payroll": true, "analytics": true, "employee_management": true}',
    '104051c7-5c90-4b94-a9d6-6a22dec0d8c1'
),
(
    '518fe5ae-2c39-46c6-8cbe-171167d07ff3',
    'Tech Solutions Pro',
    'Leading provider of enterprise software solutions and consulting services.',
    'Software',
    'large',
    'https://techsolutionspro.com',
    '456 Enterprise Blvd',
    'New York',
    'NY',
    'USA',
    '10001',
    '+1-555-0456',
    'info@techsolutionspro.com',
    'America/New_York',
    'USD',
    'en',
    '2018-06-20',
    'LLC',
    true,
    true,
    'TSP2024',
    150,
    15000000.00,
    45,
    92.75,
    500,
    '{"linkedin": "https://linkedin.com/company/techsolutionspro", "facebook": "https://facebook.com/techsolutionspro"}',
    '{"notifications": {"email": true, "push": false}, "privacy": {"public_profile": false}}',
    '{"payroll": true, "analytics": true, "employee_management": true, "advanced_reporting": true}',
    '104051c7-5c90-4b94-a9d6-6a22dec0d8c1'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    industry = EXCLUDED.industry,
    size = EXCLUDED.size,
    website = EXCLUDED.website,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    postal_code = EXCLUDED.postal_code,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    timezone = EXCLUDED.timezone,
    currency = EXCLUDED.currency,
    language = EXCLUDED.language,
    founded_date = EXCLUDED.founded_date,
    business_type = EXCLUDED.business_type,
    is_active = EXCLUDED.is_active,
    is_public = EXCLUDED.is_public,
    join_code = EXCLUDED.join_code,
    total_employees = EXCLUDED.total_employees,
    total_revenue = EXCLUDED.total_revenue,
    job_applicants = EXCLUDED.job_applicants,
    attendance_report = EXCLUDED.attendance_report,
    tasks = EXCLUDED.tasks,
    social_media = EXCLUDED.social_media,
    settings = EXCLUDED.settings,
    features = EXCLUDED.features,
    updated_at = NOW();

-- Create a view for organization statistics
CREATE OR REPLACE VIEW organization_stats AS
SELECT 
    o.id,
    o.name,
    o.industry,
    o.size,
    o.total_employees,
    o.total_revenue,
    o.job_applicants,
    o.attendance_report,
    o.tasks,
    COUNT(p.id) as actual_employee_count,
    COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_employees,
    COUNT(CASE WHEN p.role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN p.role = 'organization_member' THEN 1 END) as member_count,
    o.created_at,
    o.updated_at
FROM organizations o
LEFT JOIN profiles p ON o.id = p.organization_id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.industry, o.size, o.total_employees, o.total_revenue, 
         o.job_applicants, o.attendance_report, o.tasks, o.created_at, o.updated_at;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT SELECT ON organization_stats TO authenticated;

-- Create RLS policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view organizations they belong to or public organizations
CREATE POLICY "Users can view their organization or public organizations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) OR is_public = true
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

-- Policy: Organization creators and admins can update their organization
CREATE POLICY "Organization creators and admins can update" ON organizations
    FOR UPDATE USING (
        created_by = auth.uid() OR
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

COMMENT ON TABLE organizations IS 'Improved organizations table with comprehensive business information and metrics';
COMMENT ON COLUMN organizations.social_media IS 'JSON object containing social media links';
COMMENT ON COLUMN organizations.settings IS 'JSON object containing organization settings and preferences';
COMMENT ON COLUMN organizations.features IS 'JSON object containing enabled features and capabilities'; 