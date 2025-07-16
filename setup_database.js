const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please check your .env file has:');
    console.log('- SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
    try {
        console.log('🔧 Setting up database with invite code functionality...');
        
        // First, let's check if the employees table exists
        console.log('📋 Checking employees table...');
        const { data: tableCheck, error: tableError } = await supabase
            .from('employees')
            .select('count')
            .limit(1);
        
        if (tableError) {
            console.error('❌ Employees table not found. Please run the employee schema first.');
            console.log('Run the contents of database/employee_schema.sql in your Supabase dashboard');
            return;
        }
        
        console.log('✅ Employees table found');
        
        // Check if invite_code column already exists
        console.log('🔍 Checking for invite_code column...');
        const { data: columnCheck, error: columnError } = await supabase
            .from('employees')
            .select('invite_code')
            .limit(1);
        
        if (columnError && columnError.message.includes('column "invite_code" does not exist')) {
            console.log('📝 Adding invite code columns...');
            
            // Add the invite code columns
            const { error: alterError } = await supabase.rpc('exec_sql', {
                sql: `
                ALTER TABLE employees 
                ADD COLUMN invite_code VARCHAR(10) UNIQUE,
                ADD COLUMN invite_code_generated_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN invite_code_expires_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN invite_sent_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN invite_sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
                `
            });
            
            if (alterError) {
                console.error('❌ Error adding invite code columns:', alterError);
                console.log('Please run the SQL manually in Supabase dashboard');
                return;
            }
            
            console.log('✅ Invite code columns added');
        } else {
            console.log('✅ Invite code columns already exist');
        }
        
        // Add sample employees if none exist
        console.log('👥 Checking for existing employees...');
        const { data: employees, error: employeesError } = await supabase
            .from('employees')
            .select('id')
            .limit(5);
        
        if (employeesError) {
            console.error('❌ Error checking employees:', employeesError);
            return;
        }
        
        if (!employees || employees.length === 0) {
            console.log('📝 Adding sample employees...');
            
            // Get organization ID (create one if needed)
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
            }
            
            // Add sample employees
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
                    is_active: true
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
                    is_active: true
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
                    is_active: true
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
            console.log(`✅ Found ${employees.length} existing employees`);
        }
        
        console.log('🎉 Database setup completed successfully!');
        console.log('📋 Next steps:');
        console.log('1. Refresh your browser');
        console.log('2. Go to the Users page');
        console.log('3. You should see employees with invite codes');
        console.log('4. Try adding a new employee - it will be saved to the database');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
    }
}

setupDatabase(); 