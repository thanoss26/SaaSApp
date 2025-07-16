-- Migration: Add new roles (super_admin, manager) and teams support
-- Run this in your Supabase SQL editor

-- Step 1: Create teams table first
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add team_id column to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Step 3: Update role constraint to include new roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'manager', 'organization_member'));

-- Step 4: Add index for team_id
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON profiles(team_id);

-- Step 5: Enable RLS on teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Organizations are viewable by members" ON organizations;
DROP POLICY IF EXISTS "Organizations can be created by admins" ON organizations;
DROP POLICY IF EXISTS "Organizations can be updated by admins" ON organizations;
DROP POLICY IF EXISTS "Admins can manage all profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view messages in their organization" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their organization" ON messages;
DROP POLICY IF EXISTS "Users can view timesheets in their organization" ON timesheets;

-- Step 7: Create new policies with super_admin and manager support

-- Organizations policies
CREATE POLICY "Super admin can access all orgs" ON organizations
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Organizations are viewable by members" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Organizations can be created by admins" ON organizations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Organizations can be updated by admins" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Profiles policies
CREATE POLICY "Super admin can access all profiles" ON profiles
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admins can manage all profiles in their organization" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = profiles.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Managers can manage users in their team" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND team_id = profiles.team_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Teams policies
CREATE POLICY "Super admin can access all teams" ON teams
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Admins and managers can access teams in their org" ON teams
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Messages policies
CREATE POLICY "Super admin can access all messages" ON messages
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view messages in their organization" ON messages
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can create messages in their organization" ON messages
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Timesheets policies
CREATE POLICY "Super admin can access all timesheets" ON timesheets
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view timesheets in their organization" ON timesheets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Step 8: Create a default team for existing organizations (optional)
-- This creates a "General" team for each existing organization
INSERT INTO teams (organization_id, name)
SELECT id, 'General' 
FROM organizations 
WHERE id NOT IN (SELECT organization_id FROM teams WHERE name = 'General');

-- Step 9: Create role descriptions table for UI/documentation
CREATE TABLE IF NOT EXISTS role_descriptions (
    role VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert role descriptions
INSERT INTO role_descriptions (role, title, description, permissions) VALUES
('super_admin', 'Super Administrator', 'SaaS owner/support. Access all organizations, analytics, manage flagged accounts.', 
 '{"can_access_all_orgs": true, "can_manage_billing": true, "can_view_analytics": true, "can_manage_users": true, "can_manage_teams": true}'),
('admin', 'Administrator', 'Organization owner. Manage organization, invite/promote users, billing, settings.', 
 '{"can_manage_org": true, "can_invite_users": true, "can_promote_users": true, "can_manage_billing": true, "can_manage_teams": true}'),
('manager', 'Manager', 'Team/department lead. Manage users in team, approve PTO, no billing access.', 
 '{"can_manage_team": true, "can_approve_pto": true, "can_view_team_reports": true, "can_manage_team_users": true}'),
('organization_member', 'Organization Member', 'Regular user. View/edit own profile, submit timesheets, view org info.', 
 '{"can_edit_profile": true, "can_submit_timesheets": true, "can_view_org_info": true}')
ON CONFLICT (role) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions;

-- Enable RLS on role_descriptions
ALTER TABLE role_descriptions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read role descriptions
CREATE POLICY "Users can view role descriptions" ON role_descriptions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Success message
SELECT 'Migration completed successfully! New roles (super_admin, manager) and teams support have been added.' as status; 