const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please check your .env file for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupEmployeeTable() {
    console.log('🚀 Setting up Employee Table in Supabase...\n');

    try {
        // Check if employees table already exists
        console.log('🔍 Checking if employees table exists...');
        const { data: existingTable, error: checkError } = await supabase
            .from('employees')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            console.log('📋 Employees table does not exist. Creating it...');
            console.log('⚠️  Since Supabase client cannot create tables directly,');
            console.log('   you need to run the SQL manually in your Supabase dashboard.');
            console.log('\n📋 Please follow these steps:');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Copy and paste the content from database/employee_table_manual.sql');
            console.log('4. Run the SQL script');
            console.log('\n📋 Or use the simplified SQL below:');
            
            console.log('\n```sql');
            console.log('-- Create employees table');
            console.log('CREATE TABLE employees (');
            console.log('    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,');
            console.log('    first_name VARCHAR(100) NOT NULL,');
            console.log('    last_name VARCHAR(100) NOT NULL,');
            console.log('    email VARCHAR(255) UNIQUE NOT NULL,');
            console.log('    phone VARCHAR(20),');
            console.log('    employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN (\'full_time\', \'part_time\', \'contractor\')),');
            console.log('    job_title VARCHAR(100) NOT NULL,');
            console.log('    department VARCHAR(50) NOT NULL,');
            console.log('    work_location VARCHAR(20) NOT NULL CHECK (work_location IN (\'remote\', \'hybrid\', \'onsite\')),');
            console.log('    reporting_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,');
            console.log('    employee_status VARCHAR(20) NOT NULL DEFAULT \'active\' CHECK (employee_status IN (\'active\', \'on_leave\', \'terminated\')),');
            console.log('    date_of_joining DATE NOT NULL,');
            console.log('    salary DECIMAL(12,2),');
            console.log('    currency VARCHAR(3) DEFAULT \'USD\' CHECK (currency IN (\'USD\', \'EUR\', \'GBP\', \'CAD\', \'AUD\')),');
            console.log('    pay_frequency VARCHAR(20) CHECK (pay_frequency IN (\'monthly\', \'biweekly\', \'weekly\')),');
            console.log('    annual_bonus DECIMAL(12,2) DEFAULT 0,');
            console.log('    benefits_package VARCHAR(20) CHECK (benefits_package IN (\'standard\', \'premium\', \'executive\')),');
            console.log('    work_schedule VARCHAR(20) CHECK (work_schedule IN (\'9to5\', \'flexible\', \'shift\', \'parttime\')),');
            console.log('    work_days VARCHAR(20) CHECK (work_days IN (\'monday_friday\', \'tuesday_saturday\', \'sunday_thursday\', \'custom\')),');
            console.log('    break_time VARCHAR(10) CHECK (break_time IN (\'30min\', \'45min\', \'60min\', \'flexible\')),');
            console.log('    overtime_eligible BOOLEAN DEFAULT true,');
            console.log('    employee_id VARCHAR(20) UNIQUE,');
            console.log('    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,');
            console.log('    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,');
            console.log('    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,');
            console.log('    certifications JSONB,');
            console.log('    terms_accepted BOOLEAN DEFAULT false,');
            console.log('    terms_accepted_at TIMESTAMP WITH TIME ZONE,');
            console.log('    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,');
            console.log('    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,');
            console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
            console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
            console.log('    notes TEXT,');
            console.log('    emergency_contact JSONB,');
            console.log('    address JSONB,');
            console.log('    tax_info JSONB,');
            console.log('    bank_info JSONB,');
            console.log('    performance_rating DECIMAL(3,2) CHECK (performance_rating >= 0 AND performance_rating <= 5),');
            console.log('    last_review_date DATE,');
            console.log('    next_review_date DATE,');
            console.log('    probation_end_date DATE,');
            console.log('    contract_end_date DATE,');
            console.log('    is_active BOOLEAN DEFAULT true,');
            console.log('    is_deleted BOOLEAN DEFAULT false,');
            console.log('    deleted_at TIMESTAMP WITH TIME ZONE,');
            console.log('    deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL');
            console.log(');');
            console.log('```');
            
            console.log('\n📋 After creating the table, run this script again to verify it was created successfully.');
            
        } else if (checkError) {
            console.error('❌ Error checking table:', checkError);
        } else {
            console.log('✅ Employees table already exists!');
            
            // Check if there are any employees
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('id, first_name, last_name, email, employee_id')
                .limit(5);
            
            if (empError) {
                console.error('❌ Error checking employees:', empError);
            } else {
                console.log(`📊 Found ${employees.length} employees in the table:`);
                employees.forEach(emp => {
                    console.log(`   - ${emp.employee_id || 'No ID'}: ${emp.first_name} ${emp.last_name} (${emp.email})`);
                });
            }
        }

        console.log('\n✅ Employee table setup completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Update your backend API routes to use the new employees table');
        console.log('2. Update the frontend to send data to the new employee endpoints');
        console.log('3. Test the employee creation flow');

    } catch (error) {
        console.error('❌ Error setting up employee table:', error);
    }
}

setupEmployeeTable(); 