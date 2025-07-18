-- Dashboard Data Schema
-- This adds all the missing data fields and tables needed for real dashboard functionality

-- 1. Add missing fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS total_employees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS job_applicants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_report DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_projects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS productivity_score DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Create projects table for active projects tracking
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    start_date DATE NOT NULL,
    end_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2) DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    project_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create project_members table for project assignments
CREATE TABLE IF NOT EXISTS project_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) NOT NULL,
    hours_allocated INTEGER DEFAULT 0,
    hours_worked INTEGER DEFAULT 0,
    joined_date DATE NOT NULL,
    left_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);

-- 4. Create tasks table for task management
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    completed_date DATE,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create attendance table for attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(4,2),
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 6. Create performance_metrics table for productivity tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    productivity_score DECIMAL(5,2) CHECK (productivity_score >= 0 AND productivity_score <= 100),
    quality_score DECIMAL(5,2) CHECK (quality_score >= 0 AND quality_score <= 100),
    attendance_score DECIMAL(5,2) CHECK (attendance_score >= 0 AND attendance_score <= 100),
    collaboration_score DECIMAL(5,2) CHECK (collaboration_score >= 0 AND collaboration_score <= 100),
    overall_score DECIMAL(5,2) CHECK (overall_score >= 0 AND overall_score <= 100),
    goals_completed INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    feedback TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create job_applications table for applicant tracking
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_phone VARCHAR(20),
    resume_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'interviewed', 'offered', 'hired', 'rejected')),
    source VARCHAR(50),
    experience_years INTEGER,
    expected_salary DECIMAL(12,2),
    notes TEXT,
    applied_date DATE NOT NULL,
    reviewed_date DATE,
    interviewed_date DATE,
    offered_date DATE,
    hired_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create revenue_tracking table for financial data
CREATE TABLE IF NOT EXISTS revenue_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    revenue_amount DECIMAL(15,2) NOT NULL,
    revenue_type VARCHAR(50) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    invoice_number VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create department_performance table for department analytics
CREATE TABLE IF NOT EXISTS department_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    department VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    employee_count INTEGER DEFAULT 0,
    avg_productivity DECIMAL(5,2) DEFAULT 0,
    avg_attendance DECIMAL(5,2) DEFAULT 0,
    projects_completed INTEGER DEFAULT 0,
    revenue_generated DECIMAL(15,2) DEFAULT 0,
    cost_center DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, department, period_start, period_end)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee_id ON project_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_organization_id ON attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_employee_id ON performance_metrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_job_applications_organization_id ON job_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_organization_id ON revenue_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_period ON revenue_tracking(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_department_performance_org_dept ON department_performance(organization_id, department);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their organization" ON projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins can manage projects in their organization" ON projects
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks in their organization" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can update their assigned tasks" ON tasks
    FOR UPDATE USING (
        assigned_to IN (
            SELECT id FROM employees 
            WHERE profile_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- RLS Policies for attendance
CREATE POLICY "Users can view attendance in their organization" ON attendance
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can update their own attendance" ON attendance
    FOR UPDATE USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE profile_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_dashboard_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON attendance 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

CREATE TRIGGER update_performance_metrics_updated_at 
    BEFORE UPDATE ON performance_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

CREATE TRIGGER update_job_applications_updated_at 
    BEFORE UPDATE ON job_applications 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

CREATE TRIGGER update_revenue_tracking_updated_at 
    BEFORE UPDATE ON revenue_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

CREATE TRIGGER update_department_performance_updated_at 
    BEFORE UPDATE ON department_performance 
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_data_updated_at();

-- Create views for dashboard data aggregation
CREATE OR REPLACE VIEW dashboard_metrics AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT CASE WHEN e.is_active = true THEN e.id END) as active_employees,
    COUNT(DISTINCT p.id) as active_projects,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT ja.id) as job_applicants,
    COALESCE(AVG(pm.overall_score), 0) as avg_productivity_score,
    COALESCE(AVG(a.total_hours), 0) as avg_attendance_hours,
    COALESCE(SUM(rt.revenue_amount), 0) as total_revenue
FROM organizations o
LEFT JOIN employees e ON o.id = e.organization_id AND e.is_deleted = false
LEFT JOIN projects p ON o.id = p.organization_id AND p.status = 'active'
LEFT JOIN tasks t ON o.id = t.organization_id
LEFT JOIN job_applications ja ON o.id = ja.organization_id AND ja.status IN ('pending', 'reviewed', 'interviewed')
LEFT JOIN performance_metrics pm ON e.id = pm.employee_id
LEFT JOIN attendance a ON e.id = a.employee_id AND a.date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN revenue_tracking rt ON o.id = rt.organization_id AND rt.period_start >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY o.id, o.name;

-- Create view for employee growth data
CREATE OR REPLACE VIEW employee_growth AS
SELECT 
    organization_id,
    DATE_TRUNC('month', date_of_joining) as month,
    COUNT(*) as new_employees
FROM employees 
WHERE is_deleted = false
GROUP BY organization_id, DATE_TRUNC('month', date_of_joining)
ORDER BY organization_id, month;

-- Create view for department distribution
CREATE OR REPLACE VIEW department_distribution AS
SELECT 
    organization_id,
    department,
    COUNT(*) as employee_count,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY organization_id)), 2) as percentage
FROM employees 
WHERE is_deleted = false AND is_active = true
GROUP BY organization_id, department;

-- Grant access to views
GRANT SELECT ON dashboard_metrics TO authenticated;
GRANT SELECT ON employee_growth TO authenticated;
GRANT SELECT ON department_distribution TO authenticated; 