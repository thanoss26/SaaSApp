const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEmployeesTable() {
    try {
        console.log('🔧 Fixing employees table...');
        
        // First, let's check the current table structure
        console.log('📋 Checking current employees...');
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('*');
        
        if (employeesError) {
            console.error('❌ Error checking employees:', employeesError);
            return;
        }
        
        console.log(`📊 Found ${employees.length} employees`);
        
        // If no employees exist, add sample data
        if (employees.length === 0) {
            console.log('📝 Adding sample employees...');
            
            // Get or create organization
            let { data: orgs } = await supabase
                .from('organizations')
                .select('id')
                .limit(1);
            
            let organizationId;
            if (!orgs || orgs.length === 0) {
                console.log('🏢 Creating sample organization...');
                const { data: newOrg, error: orgError } = await supabase
                    .from('organizations')
                    .insert({
                        name: 'Sample Company',
                        description: 'Sample organization for testing',
                        industry: 'Technology',
                        size: 'medium',
                        website: 'https://example.com',
                        is_active: true
                    })
                    .select()
                    .single();
                
                if (orgError) {
                    console.error('❌ Error creating organization:', orgError);
                    return;
                }
                
                organizationId = newOrg.id;
                console.log('✅ Sample organization created');
            } else {
                organizationId = orgs[0].id;
                console.log('✅ Using existing organization');
            }
            
            // Add sample employees with organization_id
            const sampleEmployees = [
                {
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john.doe@company.com',
                    phone: '+1 (555) 123-4567',
                    employment_type: 'full_time',
                    job_title: 'Software Engineer',
                    department: 'engineering',
                    work_location: 'hybrid',
                    employee_status: 'active',
                    date_of_joining: '2024-01-15',
                    salary: 75000.00,
                    currency: 'USD',
                    pay_frequency: 'monthly',
                    organization_id: organizationId,
                    is_active: true,
                    is_deleted: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    first_name: 'Jane',
                    last_name: 'Smith',
                    email: 'jane.smith@company.com',
                    phone: '+1 (555) 234-5678',
                    employment_type: 'full_time',
                    job_title: 'Marketing Manager',
                    department: 'marketing',
                    work_location: 'remote',
                    employee_status: 'active',
                    date_of_joining: '2024-02-01',
                    salary: 65000.00,
                    currency: 'USD',
                    pay_frequency: 'monthly',
                    organization_id: organizationId,
                    is_active: true,
                    is_deleted: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    first_name: 'Mike',
                    last_name: 'Johnson',
                    email: 'mike.johnson@company.com',
                    phone: '+1 (555) 345-6789',
                    employment_type: 'part_time',
                    job_title: 'Sales Representative',
                    department: 'sales',
                    work_location: 'onsite',
                    employee_status: 'active',
                    date_of_joining: '2024-03-10',
                    salary: 45000.00,
                    currency: 'USD',
                    pay_frequency: 'monthly',
                    organization_id: organizationId,
                    is_active: true,
                    is_deleted: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            
            const { data: newEmployees, error: insertError } = await supabase
                .from('employees')
                .insert(sampleEmployees)
                .select();
            
            if (insertError) {
                console.error('❌ Error adding sample employees:', insertError);
                return;
            }
            
            console.log(`✅ ${newEmployees.length} sample employees added`);
        } else {
            console.log('✅ Employees already exist');
        }
        
        // Test creating a new employee via API
        console.log('🧪 Testing employee creation...');
        
        // Get a user to use as created_by
        const { data: users } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
        
        if (users && users.length > 0) {
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
                organization_id: organizationId,
                is_active: true,
                is_deleted: false,
                created_by: users[0].id,
                updated_by: users[0].id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const { data: testResult, error: testError } = await supabase
                .from('employees')
                .insert(testEmployee)
                .select();
            
            if (testError) {
                console.error('❌ Test employee creation failed:', testError);
            } else {
                console.log('✅ Test employee created successfully');
                
                // Clean up test employee
                await supabase
                    .from('employees')
                    .delete()
                    .eq('email', 'test.user@company.com');
                console.log('🧹 Test employee cleaned up');
            }
        }
        
        console.log('🎉 Employees table setup completed!');
        console.log('📋 Next steps:');
        console.log('1. Restart your server: node server.js');
        console.log('2. Go to the Users page');
        console.log('3. You should see employees with invite codes');
        console.log('4. Try adding a new employee - it will be saved to the database');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
    }
}

fixEmployeesTable(); 