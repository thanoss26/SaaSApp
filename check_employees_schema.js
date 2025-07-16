const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmployeesSchema() {
    try {
        console.log('🔍 Checking employees table schema...');
        
        // Try to insert a simple employee without employee_id
        const testEmployee = {
            first_name: 'Test',
            last_name: 'User',
            email: 'test.user@company.com',
            phone: '+1 (555) 999-9999',
            employment_type: 'full_time',
            job_title: 'Test Engineer',
            department: 'engineering',
            work_location: 'hybrid',
            employee_status: 'active',
            date_of_joining: '2024-12-01',
            salary: 60000.00,
            currency: 'USD',
            pay_frequency: 'monthly',
            is_active: true,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('🧪 Testing employee insertion...');
        const { data: result, error } = await supabase
            .from('employees')
            .insert(testEmployee)
            .select();
        
        if (error) {
            console.error('❌ Insert error:', error);
            
            // If it's a constraint error, let's try to understand the table structure
            if (error.code === '23505') {
                console.log('🔍 This is a unique constraint violation. Let\'s check what\'s in the table...');
                
                // Check if there are any hidden records
                const { data: allEmployees, error: selectError } = await supabase
                    .from('employees')
                    .select('*');
                
                if (selectError) {
                    console.error('❌ Select error:', selectError);
                } else {
                    console.log('📊 All employees in table:', allEmployees);
                }
            }
        } else {
            console.log('✅ Test employee inserted successfully:', result);
            
            // Clean up
            await supabase
                .from('employees')
                .delete()
                .eq('email', 'test.user@company.com');
            console.log('🧹 Test employee cleaned up');
        }
        
        // Let's try to get the table structure by attempting different queries
        console.log('📋 Checking table structure...');
        
        // Try to select specific columns
        const { data: columns, error: columnsError } = await supabase
            .from('employees')
            .select('id, first_name, email, employee_id')
            .limit(1);
        
        if (columnsError) {
            console.error('❌ Columns error:', columnsError);
        } else {
            console.log('✅ Table structure check passed');
        }
        
        // Try to insert with explicit employee_id
        console.log('🧪 Testing with explicit employee_id...');
        const testEmployee2 = {
            ...testEmployee,
            email: 'test.user2@company.com',
            employee_id: 'TEST-001'
        };
        
        const { data: result2, error: error2 } = await supabase
            .from('employees')
            .insert(testEmployee2)
            .select();
        
        if (error2) {
            console.error('❌ Insert with employee_id error:', error2);
        } else {
            console.log('✅ Test employee with employee_id inserted successfully:', result2);
            
            // Clean up
            await supabase
                .from('employees')
                .delete()
                .eq('email', 'test.user2@company.com');
            console.log('🧹 Test employee 2 cleaned up');
        }
        
    } catch (error) {
        console.error('❌ Schema check failed:', error);
    }
}

checkEmployeesSchema(); 