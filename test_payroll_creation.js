const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestPayroll() {
    console.log('🧪 Creating test payroll for payment testing...');
    
    try {
        // Use a specific organization ID that we know exists
        const organizationId = '518fe5ae-2c39-46c6-8cbe-171167d07ff3';
        console.log('🏢 Using organization ID:', organizationId);
        
        // Get an employee from this organization
        const { data: employees, error: employeesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('organization_id', organizationId)
            .limit(1);
            
        if (employeesError || !employees.length) {
            console.error('❌ No employees found in organization:', employeesError);
            return;
        }
        
        const employee = employees[0];
        console.log('👤 Found employee:', employee.first_name, employee.last_name);
        
        // Create a test payroll
        const payrollData = {
            payroll_id: `PAY-${Date.now()}`,
            employee_id: employee.id,
            organization_id: organizationId,
            pay_period: 'weekly',
            start_date: '2025-07-14',
            end_date: '2025-07-20',
            base_salary: 2500.00,
            bonus: 500.00,
            reimbursement: 150.00,
            deductions: 200.00,
            total_amount: 2950.00,
            status: 'pending',
            notes: 'Test payroll for payment functionality',
            created_by: employee.id // Use the employee as the creator
        };
        
        const { data: payroll, error: payrollError } = await supabase
            .from('payrolls')
            .insert(payrollData)
            .select()
            .single();
            
        if (payrollError) {
            console.error('❌ Error creating test payroll:', payrollError);
            return;
        }
        
        console.log('✅ Test payroll created successfully:', payroll);
        console.log('💰 Payroll ID:', payroll.id);
        console.log('💳 Status: Pending (ready for payment)');
        console.log('👤 Employee:', employee.first_name, employee.last_name);
        console.log('💵 Total Amount: $', payroll.total_amount);
        
    } catch (error) {
        console.error('❌ Error in test payroll creation:', error);
    }
}

createTestPayroll(); 