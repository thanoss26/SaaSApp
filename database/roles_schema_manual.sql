-- Create roles table with proper relationship to profiles table
-- Manual SQL to run in Supabase SQL Editor

-- Step 1: Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert default roles that match the existing system
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Super Administrator with full system access', '{"all": true}'),
('admin', 'Organization Administrator', '{"organization": {"read": true, "write": true, "delete": true}, "users": {"read": true, "write": true}, "employees": {"read": true, "write": true, "delete": true}, "analytics": {"read": true}}'),
('manager', 'Team Manager', '{"team": {"read": true, "write": true}, "employees": {"read": true, "write": true}, "analytics": {"read": true}}'),
('organization_member', 'Organization Member', '{"profile": {"read": true, "write": true}, "timesheets": {"read": true, "write": true}}'),
('hr', 'Human Resources', '{"employees": {"read": true, "write": true}, "payroll": {"read": true, "write": true}, "analytics": {"read": true}}')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Add role_id column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role_id') THEN
        ALTER TABLE profiles ADD COLUMN role_id INTEGER REFERENCES roles(id);
    END IF;
END $$;

-- Step 4: Update existing profiles to have proper role_id based on their role field
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'super_admin') WHERE role = 'super_admin';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE role = 'admin';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'manager') WHERE role = 'manager';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'organization_member') WHERE role = 'organization_member';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'hr') WHERE role = 'hr';

-- Set default role_id for profiles without one
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'organization_member') WHERE role_id IS NULL;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);

-- Step 6: Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for roles table
-- Allow all authenticated users to read roles
CREATE POLICY "All authenticated users can read roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only super_admin can modify roles
CREATE POLICY "Only super_admin can modify roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role_id = (SELECT id FROM roles WHERE name = 'super_admin')
        )
    );

-- Step 8: Add trigger to update role_id when role field changes
CREATE OR REPLACE FUNCTION sync_profile_role_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Update role_id based on role field
    NEW.role_id := (SELECT id FROM roles WHERE name = NEW.role);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_sync_profile_role_id ON profiles;
CREATE TRIGGER trigger_sync_profile_role_id
    BEFORE INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_id();

-- Step 9: Add function to get user role by id
CREATE OR REPLACE FUNCTION get_user_role_name(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    role_name TEXT;
BEGIN
    SELECT r.name INTO role_name
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = user_id;
    
    RETURN COALESCE(role_name, 'organization_member');
END;
$$ LANGUAGE plpgsql;

-- Verify the setup
SELECT 'Roles table created and populated successfully' as status;
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as profiles_with_role_id FROM profiles WHERE role_id IS NOT NULL; 