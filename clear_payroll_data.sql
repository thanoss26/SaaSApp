-- Clear all payroll data
DELETE FROM payrolls;
DELETE FROM payments;
DELETE FROM stripe_payments;

-- Reset sequences if they exist
-- Note: This is for PostgreSQL, adjust for your database if needed
-- ALTER SEQUENCE payrolls_id_seq RESTART WITH 1;

-- Verify tables are empty
SELECT 'payrolls' as table_name, COUNT(*) as record_count FROM payrolls
UNION ALL
SELECT 'payments' as table_name, COUNT(*) as record_count FROM payments
UNION ALL
SELECT 'stripe_payments' as table_name, COUNT(*) as record_count FROM stripe_payments; 