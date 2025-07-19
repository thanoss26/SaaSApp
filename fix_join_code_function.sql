-- Fix Join Code Generation Function
-- The issue is that there's a function generating 8-character codes but the table expects 6
-- Also need to handle view dependencies

-- Step 1: Drop the problematic function that generates 8-character codes
DROP FUNCTION IF EXISTS generate_organization_join_code();

-- Step 2: Drop the view that depends on join_code column
DROP VIEW IF EXISTS organizations_admin_view;

-- Step 3: Check if there are any existing 8-character join codes and fix them
SELECT 'Checking for 8-character join codes...' as info;
SELECT id, name, join_code, LENGTH(join_code) as code_length 
FROM organizations 
WHERE LENGTH(join_code) = 8;

-- Step 4: Truncate any 8-character codes to 6 characters
UPDATE organizations 
SET join_code = LEFT(join_code, 6)
WHERE LENGTH(join_code) = 8;

-- Step 5: Now we can alter the column type since the view is dropped
ALTER TABLE organizations ALTER COLUMN join_code TYPE VARCHAR(6);

-- Step 6: Create a new function that generates 6-character codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    code VARCHAR(6);
    exists_already BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 6-character code (alphanumeric)
        code := upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM organizations WHERE join_code = code) INTO exists_already;
        
        -- If code doesn't exist, return it
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Recreate the organizations_admin_view (if it existed)
-- This is a basic recreation - adjust the SELECT statement as needed for your specific view
CREATE OR REPLACE VIEW organizations_admin_view AS
SELECT 
    o.id,
    o.name,
    o.join_code,
    o.created_at,
    o.updated_at,
    COUNT(p.id) as member_count
FROM organizations o
LEFT JOIN profiles p ON o.id = p.organization_id
GROUP BY o.id, o.name, o.join_code, o.created_at, o.updated_at;

-- Step 8: Verify the fix
SELECT 'After fix - join codes:' as info;
SELECT id, name, join_code, LENGTH(join_code) as code_length 
FROM organizations 
ORDER BY code_length DESC;

-- Step 9: Test the new function
SELECT 'Testing new function:' as info;
SELECT generate_join_code() as test_code, LENGTH(generate_join_code()) as test_length;

-- Step 10: Verify the view works
SELECT 'Testing view:' as info;
SELECT * FROM organizations_admin_view LIMIT 5; 