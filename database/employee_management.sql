-- Employee Management System Tables
-- This migration adds comprehensive employee management functionality

-- 1. Employment Details Table
CREATE TABLE employment_details (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Optional manager link
    employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
    start_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
    work_location VARCHAR(50) NOT NULL CHECK (work_location IN ('remote', 'hybrid', 'onsite')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 2. Payroll & HR Table
CREATE TABLE payroll_hr (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    salary DECIMAL(12,2), -- Optional salary
    currency VARCHAR(3) CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')),
    bank_account VARCHAR(255), -- Masked/tokenized, not raw
    tax_id VARCHAR(100), -- Optional tax ID
    work_hours_per_week INTEGER NOT NULL CHECK (work_hours_per_week > 0 AND work_hours_per_week <= 168),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 3. Location & Contact Info Table
CREATE TABLE location_contact (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    phone_number VARCHAR(50), -- Optional for 2FA/calls
    address TEXT NOT NULL, -- City/region/country
    timezone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 4. Employee Certifications Table
CREATE TABLE employee_certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Secure storage path
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'jpeg', 'png')),
    file_size INTEGER NOT NULL, -- File size in bytes
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Audit / Metadata Table
CREATE TABLE employee_audit (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE, -- Sync from auth.users.last_sign_in
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX idx_employment_details_user_id ON employment_details(user_id);
CREATE INDEX idx_employment_details_organization_id ON employment_details(organization_id);
CREATE INDEX idx_employment_details_manager_id ON employment_details(manager_id);
CREATE INDEX idx_employment_details_department ON employment_details(department);
CREATE INDEX idx_employment_details_status ON employment_details(status);

CREATE INDEX idx_payroll_hr_user_id ON payroll_hr(user_id);
CREATE INDEX idx_payroll_hr_organization_id ON payroll_hr(organization_id);

CREATE INDEX idx_location_contact_user_id ON location_contact(user_id);
CREATE INDEX idx_location_contact_organization_id ON location_contact(organization_id);

CREATE INDEX idx_employee_certifications_user_id ON employee_certifications(user_id);
CREATE INDEX idx_employee_certifications_organization_id ON employee_certifications(organization_id);

CREATE INDEX idx_employee_audit_user_id ON employee_audit(user_id);
CREATE INDEX idx_employee_audit_organization_id ON employee_audit(organization_id);

-- Enable Row Level Security (RLS)
ALTER TABLE employment_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_hr ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employment_details
CREATE POLICY "Super admin can access all employment details" ON employment_details
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view their own employment details" ON employment_details
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view employment details in their organization" ON employment_details
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage employment details in their organization" ON employment_details
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = employment_details.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Managers can view employment details of their team members" ON employment_details
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'manager' 
            AND team_id IN (
                SELECT team_id FROM profiles WHERE id = employment_details.user_id
            )
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for payroll_hr (more restrictive for sensitive data)
CREATE POLICY "Super admin can access all payroll data" ON payroll_hr
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view their own payroll data" ON payroll_hr
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage payroll data in their organization" ON payroll_hr
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = payroll_hr.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for location_contact
CREATE POLICY "Super admin can access all location contact data" ON location_contact
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view their own location contact data" ON location_contact
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view location contact data in their organization" ON location_contact
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage location contact data in their organization" ON location_contact
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = location_contact.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for employee_certifications
CREATE POLICY "Super admin can access all certifications" ON employee_certifications
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view their own certifications" ON employee_certifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view certifications in their organization" ON employee_certifications
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage certifications in their organization" ON employee_certifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = employee_certifications.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for employee_audit
CREATE POLICY "Super admin can access all audit data" ON employee_audit
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view their own audit data" ON employee_audit
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view audit data in their organization" ON employee_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin' 
            AND organization_id = employee_audit.organization_id
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_employment_details_updated_at 
    BEFORE UPDATE ON employment_details 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_hr_updated_at 
    BEFORE UPDATE ON payroll_hr 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_contact_updated_at 
    BEFORE UPDATE ON location_contact 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_audit_updated_at 
    BEFORE UPDATE ON employee_audit 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create employee record with all related data
CREATE OR REPLACE FUNCTION create_employee(
    p_user_id UUID,
    p_organization_id UUID,
    p_position_title VARCHAR(255),
    p_department VARCHAR(100),
    p_employment_type VARCHAR(20),
    p_start_date DATE,
    p_work_location VARCHAR(50),
    p_work_hours_per_week INTEGER,
    p_address TEXT,
    p_timezone VARCHAR(50),
    p_terms_accepted BOOLEAN,
    p_salary DECIMAL(12,2) DEFAULT NULL,
    p_currency VARCHAR(3) DEFAULT NULL,
    p_bank_account VARCHAR(255) DEFAULT NULL,
    p_tax_id VARCHAR(100) DEFAULT NULL,
    p_phone_number VARCHAR(50) DEFAULT NULL,
    p_manager_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_employment_id UUID;
    v_payroll_id UUID;
    v_location_id UUID;
    v_audit_id UUID;
BEGIN
    -- Insert employment details
    INSERT INTO employment_details (
        user_id, organization_id, position_title, department, manager_id,
        employment_type, start_date, status, work_location
    ) VALUES (
        p_user_id, p_organization_id, p_position_title, p_department, p_manager_id,
        p_employment_type, p_start_date, 'active', p_work_location
    ) RETURNING id INTO v_employment_id;

    -- Insert payroll data
    INSERT INTO payroll_hr (
        user_id, organization_id, salary, currency, bank_account, tax_id, work_hours_per_week
    ) VALUES (
        p_user_id, p_organization_id, p_salary, p_currency, p_bank_account, p_tax_id, p_work_hours_per_week
    ) RETURNING id INTO v_payroll_id;

    -- Insert location contact data
    INSERT INTO location_contact (
        user_id, organization_id, phone_number, address, timezone
    ) VALUES (
        p_user_id, p_organization_id, p_phone_number, p_address, p_timezone
    ) RETURNING id INTO v_location_id;

    -- Insert audit data
    INSERT INTO employee_audit (
        user_id, organization_id, terms_accepted, terms_accepted_at
    ) VALUES (
        p_user_id, p_organization_id, p_terms_accepted, 
        CASE WHEN p_terms_accepted THEN NOW() ELSE NULL END
    ) RETURNING id INTO v_audit_id;

    RETURN v_employment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated; 