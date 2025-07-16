const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEmployeeCreation() {
    try {
        console.log('🧪 Testing employee creation with fixed reporting_manager_id...');
        
        // Your organization ID
        const organizationId = '3617f9ff-6993-41c2-ab22-fbdd345f86aa';
        
        // Test employee data (matching the frontend form structure)
        const testEmployee = {
            first_name: 'Test',
            last_name: 'Employee',
            email: 'test.employee@company.com',
            phone: '+1 (555) 123-4567',
            employment_type: 'full_time',
            job_title: 'Software Engineer',
            department: 'Engineering',
            work_location: 'hybrid',
            reporting_manager_id: null, // Fixed: set to null instead of string
            employee_status: 'active',
            date_of_joining: '2025-01-15',
            salary: 75000,
            currency: 'USD',
            pay_frequency: 'monthly',
            annual_bonus: 5000,
            benefits_package: 'standard',
            work_schedule: '9to5',
            work_days: 'monday_friday',
            break_time: '30min',
            overtime_eligible: true,
            terms_accepted: true,
            organization_id: organizationId,
            is_active: true,
            is_deleted: false,
            created_by: '3ceaee77-8ebf-4819-b21a-b8a5dd1706ac',
            updated_by: '3ceaee77-8ebf-4819-b21a-b8a5dd1706ac'
        };
        
        console.log('📝 Creating test employee...');
        const { data, error } = await supabase
            .from('employees')
            .insert([testEmployee])
            .select()
            .single();
            
        if (error) {
            console.error('❌ Error creating test employee:', error);
            return;
        }
        
        console.log('✅ Test employee created successfully!');
        console.log('📊 Employee ID:', data.id);
        console.log('📊 Employee Name:', data.first_name, data.last_name);
        console.log('📊 Employee Email:', data.email);
        console.log('📊 Organization ID:', data.organization_id);
        console.log('📊 Reporting Manager ID:', data.reporting_manager_id);
        
        // Clean up - delete the test employee
        console.log('🧹 Cleaning up test employee...');
        const { error: deleteError } = await supabase
            .from('employees')
            .delete()
            .eq('id', data.id);
            
        if (deleteError) {
            console.error('⚠️ Warning: Could not delete test employee:', deleteError);
        } else {
            console.log('✅ Test employee cleaned up successfully');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testEmployeeCreation(); 