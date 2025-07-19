-- Payroll Management Schema
-- This schema handles payroll creation, management, and tracking

-- Create payrolls table
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_id VARCHAR(20) UNIQUE NOT NULL,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pay_period VARCHAR(20) NOT NULL CHECK (pay_period IN ('weekly', 'biweekly', 'monthly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    base_salary DECIMAL(10,2) NOT NULL CHECK (base_salary >= 0),
    bonus DECIMAL(10,2) DEFAULT 0 CHECK (bonus >= 0),
    reimbursement DECIMAL(10,2) DEFAULT 0 CHECK (reimbursement >= 0),
    deductions DECIMAL(10,2) DEFAULT 0 CHECK (deductions >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payrolls_organization_id ON payrolls(organization_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status);
CREATE INDEX IF NOT EXISTS idx_payrolls_created_at ON payrolls(created_at);
CREATE INDEX IF NOT EXISTS idx_payrolls_payroll_id ON payrolls(payroll_id);

-- Create RLS policies for payrolls table
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payrolls from their organization
CREATE POLICY "Users can view organization payrolls" ON payrolls
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Admins can create payrolls for their organization
CREATE POLICY "Admins can create payrolls" ON payrolls
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can update payrolls in their organization
CREATE POLICY "Admins can update payrolls" ON payrolls
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Admins can delete payrolls in their organization
CREATE POLICY "Admins can delete payrolls" ON payrolls
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payrolls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payrolls_updated_at
    BEFORE UPDATE ON payrolls
    FOR EACH ROW
    EXECUTE FUNCTION update_payrolls_updated_at();

-- Create function to validate payroll dates
CREATE OR REPLACE FUNCTION validate_payroll_dates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date >= NEW.end_date THEN
        RAISE EXCEPTION 'Start date must be before end date';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate payroll dates
CREATE TRIGGER validate_payroll_dates
    BEFORE INSERT OR UPDATE ON payrolls
    FOR EACH ROW
    EXECUTE FUNCTION validate_payroll_dates();

-- Create function to calculate total amount
CREATE OR REPLACE FUNCTION calculate_payroll_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount = COALESCE(NEW.base_salary, 0) + 
                      COALESCE(NEW.bonus, 0) + 
                      COALESCE(NEW.reimbursement, 0) - 
                      COALESCE(NEW.deductions, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate total amount
CREATE TRIGGER calculate_payroll_total
    BEFORE INSERT OR UPDATE ON payrolls
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payroll_total();

-- Insert sample payroll data (optional - for testing)
-- INSERT INTO payrolls (payroll_id, employee_id, organization_id, pay_period, start_date, end_date, base_salary, bonus, reimbursement, deductions, total_amount, status, notes, created_by)
-- VALUES 
--     ('PYRL120124', '104051c7-5c90-4b94-a9d6-6a22dec0d8c1', '518fe5ae-2c39-46c6-8cbe-171167d07ff3', 'monthly', '2024-07-01', '2024-07-31', 2500.00, 500.00, 100.00, 200.00, 2900.00, 'completed', 'July 2024 payroll', '104051c7-5c90-4b94-a9d6-6a22dec0d8c1'),
--     ('PYRL120125', '4cddfe56-573f-476e-801a-6e8276962a72', '518fe5ae-2c39-46c6-8cbe-171167d07ff3', 'monthly', '2024-07-01', '2024-07-31', 2300.00, 300.00, 50.00, 150.00, 2500.00, 'pending', 'July 2024 payroll', '104051c7-5c90-4b94-a9d6-6a22dec0d8c1'); 