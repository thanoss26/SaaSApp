-- Add document and banking fields to profiles table
-- These fields will be used for comprehensive offline member information

-- Add banking and document fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS swift_code VARCHAR(11),
ADD COLUMN IF NOT EXISTS bank_country VARCHAR(3),
ADD COLUMN IF NOT EXISTS bank_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_address TEXT,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS national_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
ADD COLUMN IF NOT EXISTS documents JSONB,
ADD COLUMN IF NOT EXISTS employment_start_date DATE,
ADD COLUMN IF NOT EXISTS employment_end_date DATE,
ADD COLUMN IF NOT EXISTS salary DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'intern')),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS department VARCHAR(50),
ADD COLUMN IF NOT EXISTS work_location VARCHAR(20) CHECK (work_location IN ('remote', 'hybrid', 'onsite')),
ADD COLUMN IF NOT EXISTS employee_status VARCHAR(20) DEFAULT 'active' CHECK (employee_status IN ('active', 'on_leave', 'terminated', 'probation'));

-- Add comments for documentation
COMMENT ON COLUMN profiles.bank_name IS 'Name of the bank for payment purposes';
COMMENT ON COLUMN profiles.account_holder_name IS 'Name of the account holder for IBAN';
COMMENT ON COLUMN profiles.swift_code IS 'SWIFT/BIC code for international transfers';
COMMENT ON COLUMN profiles.bank_country IS 'Country code of the bank (ISO 3166-1 alpha-3)';
COMMENT ON COLUMN profiles.bank_city IS 'City where the bank is located';
COMMENT ON COLUMN profiles.bank_address IS 'Full address of the bank';
COMMENT ON COLUMN profiles.tax_id IS 'Tax identification number';
COMMENT ON COLUMN profiles.national_id IS 'National identification number';
COMMENT ON COLUMN profiles.passport_number IS 'Passport number for identification';
COMMENT ON COLUMN profiles.date_of_birth IS 'Date of birth for identification';
COMMENT ON COLUMN profiles.nationality IS 'Nationality of the person';
COMMENT ON COLUMN profiles.address_line1 IS 'Primary address line';
COMMENT ON COLUMN profiles.address_line2 IS 'Secondary address line';
COMMENT ON COLUMN profiles.city IS 'City of residence';
COMMENT ON COLUMN profiles.state_province IS 'State or province of residence';
COMMENT ON COLUMN profiles.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN profiles.country IS 'Country of residence';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Name of emergency contact';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Phone number of emergency contact';
COMMENT ON COLUMN profiles.emergency_contact_relationship IS 'Relationship to emergency contact';
COMMENT ON COLUMN profiles.documents IS 'JSON object storing document information and file paths';
COMMENT ON COLUMN profiles.employment_start_date IS 'Date when employment started';
COMMENT ON COLUMN profiles.employment_end_date IS 'Date when employment ended (if applicable)';
COMMENT ON COLUMN profiles.salary IS 'Annual salary amount';
COMMENT ON COLUMN profiles.currency IS 'Currency for salary (ISO 4217)';
COMMENT ON COLUMN profiles.employment_type IS 'Type of employment contract';
COMMENT ON COLUMN profiles.job_title IS 'Job title or position';
COMMENT ON COLUMN profiles.department IS 'Department or team';
COMMENT ON COLUMN profiles.work_location IS 'Work location type';
COMMENT ON COLUMN profiles.employee_status IS 'Current employment status';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_bank_name ON profiles(bank_name);
CREATE INDEX IF NOT EXISTS idx_profiles_tax_id ON profiles(tax_id);
CREATE INDEX IF NOT EXISTS idx_profiles_national_id ON profiles(national_id);
CREATE INDEX IF NOT EXISTS idx_profiles_employment_start_date ON profiles(employment_start_date);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_status ON profiles(employee_status);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON profiles(job_title);

-- Add SWIFT code validation function
CREATE OR REPLACE FUNCTION validate_swift_code(swift_text VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic SWIFT/BIC validation (8 or 11 characters, alphanumeric)
    IF swift_text IS NULL OR LENGTH(swift_text) NOT IN (8, 11) THEN
        RETURN false;
    END IF;
    
    -- Check if it contains only alphanumeric characters
    IF swift_text !~ '^[A-Z0-9]+$' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add constraint for SWIFT code validation
ALTER TABLE profiles 
ADD CONSTRAINT check_swift_code_format 
CHECK (swift_code IS NULL OR validate_swift_code(swift_code));

-- Add currency validation constraint
ALTER TABLE profiles 
ADD CONSTRAINT check_currency_format 
CHECK (currency IS NULL OR currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'CNY'));

-- Add date validation constraints
ALTER TABLE profiles 
ADD CONSTRAINT check_employment_dates 
CHECK (
    employment_start_date IS NULL OR 
    employment_end_date IS NULL OR 
    employment_start_date <= employment_end_date
);

ALTER TABLE profiles 
ADD CONSTRAINT check_date_of_birth 
CHECK (
    date_of_birth IS NULL OR 
    date_of_birth <= CURRENT_DATE
); 