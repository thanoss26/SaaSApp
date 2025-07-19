const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPayrollCreation() {
    console.log('🧪 Testing payroll creation...');
    
    try {
        // Check if there are any existing payrolls
        const { data: existingPayrolls, error: payrollsError } = await supabase
            .from('payrolls')
            .select('*')
            .limit(5);

        if (payrollsError) {
            console.error('❌ Error fetching existing payrolls:', payrollsError);
            console.log('❌ This might mean the payrolls table does not exist');
            return;
        }

        console.log('✅ Payrolls table exists');
        console.log('📋 Existing payrolls:', existingPayrolls?.length || 0);

        // Check if there are any employees
        const { data: employees, error: employeesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, organization_id')
            .not('organization_id', 'is', null)
            .limit(5);

        if (employeesError) {
            console.error('❌ Error fetching employees:', employeesError);
            return;
        }

        console.log('👥 Available employees:', employees?.length || 0);
        
        if (employees && employees.length > 0) {
            console.log('📝 Sample employee:', employees[0]);
        }

        // Check organizations
        const { data: organizations, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(5);

        if (orgsError) {
            console.error('❌ Error fetching organizations:', orgsError);
            return;
        }

        console.log('🏢 Available organizations:', organizations?.length || 0);
        
        if (organizations && organizations.length > 0) {
            console.log('📝 Sample organization:', organizations[0]);
        }

        // Try to create a test payroll if we have employees and organizations
        if (employees && employees.length > 0 && organizations && organizations.length > 0) {
            console.log('🧪 Attempting to create a test payroll...');
            
            const testEmployee = employees[0];
            // Use the organization that the user actually belongs to
            const userOrgId = '518fe5ae-2c39-46c6-8cbe-171167d07ff3';
            console.log('🏢 Creating payroll for organization:', userOrgId);
            
            const testPayroll = {
                payroll_id: `PYRL${Date.now().toString().slice(-6)}`,
                employee_id: testEmployee.id,
                organization_id: userOrgId,
                pay_period: 'weekly',
                start_date: '2024-01-01',
                end_date: '2024-01-07',
                base_salary: 1000.00,
                bonus: 100.00,
                reimbursement: 50.00,
                deductions: 0.00,
                total_amount: 1150.00,
                status: 'pending',
                notes: 'Test payroll created by script for user organization',
                created_by: testEmployee.id
            };
            
            const { data: newPayroll, error: createError } = await supabase
                .from('payrolls')
                .insert(testPayroll)
                .select()
                .single();
                
            if (createError) {
                console.error('❌ Error creating test payroll:', createError);
            } else {
                console.log('✅ Test payroll created successfully:', newPayroll);
                console.log('💡 This payroll should now appear in the payroll list');
                console.log('💡 You can test the payroll creation form now');
                
                // Don't delete the test payroll - leave it for testing
                console.log('💡 Test payroll left in database for testing');
            }
        }

    } catch (error) {
        console.error('❌ Error in test:', error);
    }
}

testPayrollCreation(); 