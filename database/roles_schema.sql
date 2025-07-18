-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Super Administrator with full system access', '{"all": true}'),
('admin', 'Organization Administrator', '{"organization": {"read": true, "write": true, "delete": true}, "users": {"read": true, "write": true}, "employees": {"read": true, "write": true, "delete": true}, "analytics": {"read": true}}'),
('manager', 'Team Manager', '{"team": {"read": true, "write": true}, "employees": {"read": true, "write": true}, "analytics": {"read": true}}'),
('employee', 'Regular Employee', '{"profile": {"read": true, "write": true}, "timesheet": {"read": true, "write": true}}'),
('hr', 'Human Resources', '{"employees": {"read": true, "write": true}, "analytics": {"read": true}, "payroll": {"read": true}}')
ON CONFLICT (name) DO NOTHING;

-- Add role_id column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role_id') THEN
        ALTER TABLE profiles ADD COLUMN role_id INTEGER REFERENCES roles(id);
    END IF;
END $$;

-- Update existing profiles to have proper role_id based on their role field
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'super_admin') WHERE role = 'super_admin';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE role = 'admin';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'manager') WHERE role = 'manager';
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'organization_member') WHERE role = 'organization_member';

-- Set default role_id for profiles without one
UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'employee') WHERE role_id IS NULL;

-- Create index on role_id
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);

-- Add RLS policies for roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Allow users to read roles (for role-based UI decisions)
CREATE POLICY "Users can read roles" ON roles
    FOR SELECT USING (true);

-- Only super_admin can modify roles
CREATE POLICY "Only super_admin can modify roles" ON roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role_id = (SELECT id FROM roles WHERE name = 'super_admin')
        )
    ); 