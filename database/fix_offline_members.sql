-- Fix foreign key constraint for offline members
-- This migration allows offline members to be created without requiring auth.users records

-- First, drop the existing foreign key constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add a new foreign key constraint that is deferrable
-- This allows us to temporarily disable it during offline member creation
ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

-- Create a function to handle offline member creation
CREATE OR REPLACE FUNCTION create_offline_member_profile(
    p_id UUID,
    p_email VARCHAR,
    p_first_name VARCHAR,
    p_last_name VARCHAR,
    p_role VARCHAR,
    p_organization_id UUID,
    p_phone VARCHAR DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_job_title VARCHAR DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_employment_type VARCHAR DEFAULT NULL,
    p_employment_start_date DATE DEFAULT NULL,
    p_work_location VARCHAR DEFAULT NULL,
    p_salary DECIMAL DEFAULT NULL,
    p_currency VARCHAR DEFAULT 'EUR',
    p_iban VARCHAR DEFAULT NULL,
    p_bank_name VARCHAR DEFAULT NULL,
    p_documents JSONB DEFAULT NULL,
    p_emergency_contact_name VARCHAR DEFAULT NULL,
    p_emergency_contact_phone VARCHAR DEFAULT NULL,
    p_address_line1 VARCHAR DEFAULT NULL,
    p_address_line2 VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state_province VARCHAR DEFAULT NULL,
    p_postal_code VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
    -- Temporarily disable the foreign key constraint
    SET CONSTRAINTS profiles_id_fkey DEFERRED;
    
    -- Insert the profile
    INSERT INTO profiles (
        id, email, first_name, last_name, role, organization_id,
        phone, date_of_birth, bio, job_title, department, employment_type,
        employment_start_date, work_location, salary, currency,
        iban, bank_name, documents, emergency_contact_name, emergency_contact_phone,
        address_line1, address_line2, city, state_province, postal_code, country,
        is_active, created_at, updated_at
    ) VALUES (
        p_id, p_email, p_first_name, p_last_name, p_role, p_organization_id,
        p_phone, p_date_of_birth, p_bio, p_job_title, p_department, p_employment_type,
        p_employment_start_date, p_work_location, p_salary, p_currency,
        p_iban, p_bank_name, p_documents, p_emergency_contact_name, p_emergency_contact_phone,
        p_address_line1, p_address_line2, p_city, p_state_province, p_postal_code, p_country,
        true, NOW(), NOW()
    );
    
    -- Re-enable the foreign key constraint
    SET CONSTRAINTS profiles_id_fkey IMMEDIATE;
    
    RETURN p_id;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document this change
COMMENT ON TABLE profiles IS 'Profiles table with support for offline members via deferred constraints'; 