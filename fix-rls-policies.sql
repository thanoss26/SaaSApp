-- Fix RLS Policies for profiles table
-- This script will drop the problematic policies and recreate them correctly

-- First, drop all existing policies on profiles table
DROP POLICY IF EXISTS "Admins can manage all profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Managers can manage users in their team" ON profiles;
DROP POLICY IF EXISTS "Super admin can access all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Debug: allow all select" ON profiles;

-- Recreate policies correctly

-- 1. Users can select their own profile
CREATE POLICY "Users can select their own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- 3. Users can create their own profile
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- 4. Super admin can access all profiles
CREATE POLICY "Super admin can access all profiles"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- 5. Admins can manage profiles in their organization
CREATE POLICY "Admins can manage profiles in their organization"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin' 
    AND p.organization_id = profiles.organization_id
  )
);

-- 6. Managers can manage users in their team
CREATE POLICY "Managers can manage users in their team"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'manager' 
    AND p.team_id = profiles.team_id
  )
);

-- 7. Users can view profiles in their organization (for basic member access)
CREATE POLICY "Users can view profiles in their organization"
ON profiles FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname; 

-- Fix RLS policies for payrolls table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view payrolls from their organization" ON payrolls;
DROP POLICY IF EXISTS "Admins can create payrolls for their organization" ON payrolls;
DROP POLICY IF EXISTS "Admins can update payrolls from their organization" ON payrolls;
DROP POLICY IF EXISTS "Admins can delete payrolls from their organization" ON payrolls;

-- Create new policies that allow proper access
-- Policy for viewing payrolls (users can see payrolls from their organization)
CREATE POLICY "Users can view payrolls from their organization" ON payrolls
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy for creating payrolls (admins can create payrolls for their organization)
CREATE POLICY "Admins can create payrolls for their organization" ON payrolls
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy for updating payrolls (admins can update payrolls from their organization)
CREATE POLICY "Admins can update payrolls from their organization" ON payrolls
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy for deleting payrolls (admins can delete payrolls from their organization)
CREATE POLICY "Admins can delete payrolls from their organization" ON payrolls
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Enable RLS on payrolls table if not already enabled
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY; 