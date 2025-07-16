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
        console.log('🧪 Testing employee creation...');
        
        // Get user to use as created_by
        const userEmail = 'thanosvako23@gmail.com';
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, organization_id')
            .eq('email', userEmail)
            .single();
        
        if (userError || !user) {
            console.error('❌ Error fetching user:', userError);
            return;
        }
        
        console.log('✅ User found with organization_id:', user.organization_id);
        
        // Test employee data
        const testEmployee = {
            first_name: 'Test',
            last_name: 'Employee',
            email: 'test.employee@company.com',
            phone: '+1 (555) 123-4567',
            employment_type: 'full_time',
            job_title: 'Software Engineer',
            department: 'engineering',
            work_location: 'hybrid',
            employee_status: 'active',
            date_of_joining: '2024-12-01',
            salary: 75000.00,
            currency: 'USD',
            pay_frequency: 'monthly',
            organization_id: user.organization_id,
            is_active: true,
            is_deleted: false,
            created_by: user.id,
            updated_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Inserting test employee...');
        const { data: newEmployee, error: insertError } = await supabase
            .from('employees')
            .insert(testEmployee)
            .select();
        
        if (insertError) {
            console.error('❌ Error creating employee:', insertError);
            return;
        }
        
        console.log('✅ Test employee created successfully!');
        console.log('📋 Employee details:');
        console.log('- ID:', newEmployee[0].id);
        console.log('- Name:', newEmployee[0].first_name, newEmployee[0].last_name);
        console.log('- Email:', newEmployee[0].email);
        console.log('- Organization ID:', newEmployee[0].organization_id);
        
        // Clean up test employee
        console.log('🧹 Cleaning up test employee...');
        await supabase
            .from('employees')
            .delete()
            .eq('email', 'test.employee@company.com');
        console.log('✅ Test employee cleaned up');
        
        console.log('🎉 Employee creation test passed!');
        console.log('📋 Next steps:');
        console.log('1. Go to your browser and log in again');
        console.log('2. Try creating a new employee from the UI');
        console.log('3. The employee should now be saved to the database');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testEmployeeCreation(); 