-- Fix banking fields and remove unwanted fields
-- This migration addresses the VARCHAR(3) constraint issue and removes unwanted fields

-- Fix bank_country field length (increase from VARCHAR(3) to VARCHAR(10))
ALTER TABLE profiles 
ALTER COLUMN bank_country TYPE VARCHAR(10);

-- Remove unwanted fields
ALTER TABLE profiles 
DROP COLUMN IF EXISTS account_holder_name,
DROP COLUMN IF EXISTS swift_code,
DROP COLUMN IF EXISTS bank_city,
DROP COLUMN IF EXISTS bank_address,
DROP COLUMN IF EXISTS emergency_contact_relationship;

-- Update comments
COMMENT ON COLUMN profiles.bank_country IS 'Country code of the bank (ISO 3166-1 alpha-3 or extended)';
COMMENT ON COLUMN profiles.iban IS 'International Bank Account Number for payments';
COMMENT ON COLUMN profiles.bank_name IS 'Name of the bank for payment purposes';

-- Remove SWIFT code validation function and constraint since we're removing the field
DROP FUNCTION IF EXISTS validate_swift_code CASCADE;

-- Remove indexes for dropped fields
DROP INDEX IF EXISTS idx_profiles_bank_name; 