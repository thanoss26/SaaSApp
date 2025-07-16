-- Employee Table Schema
-- This table stores comprehensive employee information for hiring and management

-- Create employee table
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Basic Information (Step 1)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- Employment Details (Step 2)
    employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
    job_title VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    work_location VARCHAR(20) NOT NULL CHECK (work_location IN ('remote', 'hybrid', 'onsite')),
    reporting_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    employee_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (employee_status IN ('active', 'on_leave', 'terminated')),
    date_of_joining DATE NOT NULL,
    
    -- Compensation Details (Step 3)
    salary DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
    pay_frequency VARCHAR(20) CHECK (pay_frequency IN ('monthly', 'biweekly', 'weekly')),
    annual_bonus DECIMAL(12,2) DEFAULT 0,
    benefits_package VARCHAR(20) CHECK (benefits_package IN ('standard', 'premium', 'executive')),
    
    -- Attendance & Schedule (Step 4)
    work_schedule VARCHAR(20) CHECK (work_schedule IN ('9to5', 'flexible', 'shift', 'parttime')),
    work_days VARCHAR(20) CHECK (work_days IN ('monday_friday', 'tuesday_saturday', 'sunday_thursday', 'custom')),
    break_time VARCHAR(10) CHECK (break_time IN ('30min', '45min', '60min', 'flexible')),
    overtime_eligible BOOLEAN DEFAULT true,
    
    -- Additional Information
    employee_id VARCHAR(20) UNIQUE, -- Custom employee ID (e.g., EMP-2024-001)
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Link to auth profile if user registers
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- File Attachments
    certifications JSONB, -- Store file paths and metadata for uploaded certifications
    
    -- Terms and Conditions
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional Metadata
    notes TEXT,
    emergency_contact JSONB, -- Store emergency contact information
    address JSONB, -- Store address information
    tax_info JSONB, -- Store tax-related information
    bank_info JSONB, -- Store bank account information for payroll
    
    -- Performance and HR Fields
    performance_rating DECIMAL(3,2) CHECK (performance_rating >= 0 AND performance_rating <= 5),
    last_review_date DATE,
    next_review_date DATE,
    probation_end_date DATE,
    contract_end_date DATE,
    
    -- System Fields
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_employees_organization_id ON employees(organization_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_employee_status ON employees(employee_status);
CREATE INDEX idx_employees_employment_type ON employees(employment_type);
CREATE INDEX idx_employees_date_of_joining ON employees(date_of_joining);
CREATE INDEX idx_employees_profile_id ON employees(profile_id);
CREATE INDEX idx_employees_team_id ON employees(team_id);
CREATE INDEX idx_employees_reporting_manager_id ON employees(reporting_manager_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_is_active ON employees(is_active);
CREATE INDEX idx_employees_is_deleted ON employees(is_deleted);

-- Enable Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employees
CREATE POLICY "Super admin can access all employees" ON employees
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view employees in their organization" ON employees
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage all employees in their organization" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = employees.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Managers can manage employees in their team" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND team_id = employees.team_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can view their own employee record" ON employees
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can update their own employee record" ON employees
    FOR UPDATE USING (profile_id = auth.uid());

-- Function to generate unique employee ID
CREATE OR REPLACE FUNCTION generate_employee_id()
RETURNS VARCHAR(20) AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    new_employee_id VARCHAR(20);
    exists_already BOOLEAN;
BEGIN
    -- Get current year
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(e.employee_id FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM employees e
    WHERE e.employee_id LIKE 'EMP-' || year_part || '-%';
    
    -- Generate employee ID
    new_employee_id := 'EMP-' || year_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    RETURN new_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate employee ID on insert
CREATE OR REPLACE FUNCTION set_employee_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_id IS NULL THEN
        NEW.employee_id := generate_employee_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set employee ID
CREATE TRIGGER set_employee_id_trigger
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION set_employee_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_employees_updated_at_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

-- Function to soft delete employee
CREATE OR REPLACE FUNCTION soft_delete_employee()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
        NEW.deleted_at = NOW();
        NEW.deleted_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for soft delete
CREATE TRIGGER soft_delete_employee_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_employee();

-- Function to set terms accepted timestamp
CREATE OR REPLACE FUNCTION set_terms_accepted_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.terms_accepted = true AND OLD.terms_accepted = false THEN
        NEW.terms_accepted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for terms accepted timestamp
CREATE TRIGGER set_terms_accepted_timestamp_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION set_terms_accepted_timestamp();

-- Create view for active employees only
CREATE VIEW active_employees AS
SELECT * FROM employees 
WHERE is_active = true AND is_deleted = false;

-- Create view for employee statistics
CREATE VIEW employee_stats AS
SELECT 
    organization_id,
    COUNT(*) as total_employees,
    COUNT(CASE WHEN employee_status = 'active' THEN 1 END) as active_employees,
    COUNT(CASE WHEN employee_status = 'on_leave' THEN 1 END) as on_leave_employees,
    COUNT(CASE WHEN employee_status = 'terminated' THEN 1 END) as terminated_employees,
    COUNT(CASE WHEN employment_type = 'full_time' THEN 1 END) as full_time_employees,
    COUNT(CASE WHEN employment_type = 'part_time' THEN 1 END) as part_time_employees,
    COUNT(CASE WHEN employment_type = 'contractor' THEN 1 END) as contractor_employees,
    AVG(salary) as average_salary,
    MIN(date_of_joining) as earliest_hire_date,
    MAX(date_of_joining) as latest_hire_date
FROM employees 
WHERE is_deleted = false
GROUP BY organization_id;

-- Create view for department statistics
CREATE VIEW department_stats AS
SELECT 
    organization_id,
    department,
    COUNT(*) as employee_count,
    AVG(salary) as average_salary,
    COUNT(CASE WHEN employee_status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN employment_type = 'full_time' THEN 1 END) as full_time_count
FROM employees 
WHERE is_deleted = false
GROUP BY organization_id, department;

-- Insert sample data for testing
INSERT INTO employees (
    first_name, 
    last_name, 
    email, 
    phone, 
    employment_type, 
    job_title, 
    department, 
    work_location, 
    employee_status, 
    date_of_joining, 
    salary, 
    currency, 
    pay_frequency, 
    annual_bonus, 
    benefits_package, 
    work_schedule, 
    work_days, 
    break_time, 
    overtime_eligible, 
    terms_accepted, 
    organization_id,
    created_by
) VALUES 
(
    'John',
    'Doe',
    'john.doe@company.com',
    '+1 (555) 123-4567',
    'full_time',
    'Senior Software Engineer',
    'Engineering',
    'hybrid',
    'active',
    '2024-01-15',
    85000.00,
    'USD',
    'monthly',
    10000.00,
    'premium',
    '9to5',
    'monday_friday',
    '30min',
    true,
    true,
    (SELECT id FROM organizations LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
),
(
    'Sarah',
    'Miller',
    'sarah.miller@company.com',
    '+1 (555) 234-5678',
    'full_time',
    'Marketing Manager',
    'Marketing',
    'remote',
    'active',
    '2024-02-01',
    75000.00,
    'USD',
    'monthly',
    8000.00,
    'standard',
    '9to5',
    'monday_friday',
    '30min',
    true,
    true,
    (SELECT id FROM organizations LIMIT 1),
    (SELECT id FROM profiles WHERE role = 'super_admin' LIMIT 1)
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO authenticated;
GRANT SELECT ON active_employees TO authenticated;
GRANT SELECT ON employee_stats TO authenticated;
GRANT SELECT ON department_stats TO authenticated; 