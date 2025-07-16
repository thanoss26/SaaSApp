const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAddEmployee() {
    try {
        console.log('🧪 Testing employee creation...');
        
        // Your organization ID from the logs
        const organizationId = '3617f9ff-6993-41c2-ab22-fbdd345f86aa';
        
        // Test employee data
        const testEmployee = {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@company.com',
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
            annual_bonus: 5000.00,
            benefits_package: 'standard',
            work_schedule: '9to5',
            work_days: 'monday_friday',
            break_time: '30min',
            overtime_eligible: true,
            terms_accepted: true,
            organization_id: organizationId,
            is_active: true,
            is_deleted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Creating test employee...');
        const { data: newEmployee, error } = await supabase
            .from('employees')
            .insert(testEmployee)
            .select();
        
        if (error) {
            console.error('❌ Error creating employee:', error);
            return;
        }
        
        console.log('✅ Test employee created successfully!');
        console.log('📋 Employee details:');
        console.log('- ID:', newEmployee[0].id);
        console.log('- Name:', newEmployee[0].first_name, newEmployee[0].last_name);
        console.log('- Email:', newEmployee[0].email);
        console.log('- Organization ID:', newEmployee[0].organization_id);
        
        // Verify the employee was created
        const { data: employees, error: fetchError } = await supabase
            .from('employees')
            .select('*')
            .eq('organization_id', organizationId);
        
        if (fetchError) {
            console.error('❌ Error fetching employees:', fetchError);
        } else {
            console.log(`📊 Total employees in organization: ${employees.length}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAddEmployee(); 