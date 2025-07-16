-- Add invite code field to employees table
-- This allows generating unique invite codes for each employee

-- Add invite_code column to employees table
ALTER TABLE employees 
ADD COLUMN invite_code VARCHAR(6) UNIQUE,
ADD COLUMN invite_code_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN invite_code_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN invite_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN invite_sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for invite code lookups
CREATE INDEX idx_employees_invite_code ON employees(invite_code);

-- Function to generate unique invite code (6 digits)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    new_invite_code VARCHAR(6);
    exists_already BOOLEAN;
    attempts INTEGER := 0;
    max_attempts INTEGER := 10;
BEGIN
    LOOP
        -- Generate a random 6-digit code
        new_invite_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM employees WHERE invite_code = new_invite_code)
        INTO exists_already;
        
        -- If code doesn't exist, return it
        IF NOT exists_already THEN
            RETURN new_invite_code;
        END IF;
        
        -- Prevent infinite loop
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique invite code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to set invite code and expiration
CREATE OR REPLACE FUNCTION set_employee_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate invite code if not provided
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_invite_code();
        NEW.invite_code_generated_at := NOW();
        NEW.invite_code_expires_at := NOW() + INTERVAL '7 days'; -- Expires in 7 days
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate invite code on insert
CREATE TRIGGER set_employee_invite_code_trigger
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION set_employee_invite_code();

-- Function to regenerate invite code
CREATE OR REPLACE FUNCTION regenerate_invite_code(employee_uuid UUID)
RETURNS VARCHAR(6) AS $$
DECLARE
    new_code VARCHAR(6);
BEGIN
    -- Generate new invite code
    new_code := generate_invite_code();
    
    -- Update employee record
    UPDATE employees 
    SET 
        invite_code = new_code,
        invite_code_generated_at = NOW(),
        invite_code_expires_at = NOW() + INTERVAL '7 days',
        invite_sent_at = NULL,
        invite_sent_by = NULL,
        updated_at = NOW()
    WHERE id = employee_uuid;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to mark invite as sent
CREATE OR REPLACE FUNCTION mark_invite_sent(employee_uuid UUID, sent_by_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE employees 
    SET 
        invite_sent_at = NOW(),
        invite_sent_by = sent_by_uuid,
        updated_at = NOW()
    WHERE id = employee_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to validate invite code
CREATE OR REPLACE FUNCTION validate_invite_code(code VARCHAR(6))
RETURNS TABLE(
    employee_id UUID,
    employee_email VARCHAR(255),
    employee_name TEXT,
    organization_id UUID,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.email,
        e.first_name || ' ' || e.last_name,
        e.organization_id,
        CASE 
            WHEN e.invite_code IS NULL THEN false
            WHEN e.invite_code != code THEN false
            WHEN e.invite_code_expires_at < NOW() THEN false
            WHEN e.profile_id IS NOT NULL THEN false -- Already registered
            ELSE true
        END as is_valid,
        CASE 
            WHEN e.invite_code IS NULL THEN 'No invite code found'
            WHEN e.invite_code != code THEN 'Invalid invite code'
            WHEN e.invite_code_expires_at < NOW() THEN 'Invite code has expired'
            WHEN e.profile_id IS NOT NULL THEN 'Employee already registered'
            ELSE 'Valid invite code'
        END as error_message
    FROM employees e
    WHERE e.invite_code = code;
END;
$$ LANGUAGE plpgsql;

-- Update existing employees to have invite codes
UPDATE employees 
SET 
    invite_code = generate_invite_code(),
    invite_code_generated_at = NOW(),
    invite_code_expires_at = NOW() + INTERVAL '7 days'
WHERE invite_code IS NULL; 