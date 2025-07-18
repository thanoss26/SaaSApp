const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSampleEmployees() {
  try {
    console.log('🔧 Creating sample employees...');

    // Get the super_admin user and their organization
    const { data: superAdmin, error: adminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'super_admin')
      .single();

    if (adminError) {
      console.error('❌ Error fetching super_admin:', adminError);
      return;
    }

    console.log('👤 Found super_admin:', superAdmin.email);
    console.log('🏢 Organization ID:', superAdmin.organization_id);

    if (!superAdmin.organization_id) {
      console.log('❌ Super_admin has no organization assigned');
      return;
    }

    // Check if employees already exist
    const { count: existingCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', superAdmin.organization_id)
      .eq('is_deleted', false);

    if (existingCount > 0) {
      console.log(`✅ Found ${existingCount} existing employees, skipping creation`);
      return;
    }

    // Create sample employees
    const sampleEmployees = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@chronoshr.com',
        phone: '+1 (555) 123-4567',
        employment_type: 'full_time',
        job_title: 'Software Engineer',
        department: 'engineering',
        work_location: 'hybrid',
        employee_status: 'active',
        date_of_joining: '2024-01-15',
        salary: 85000.00,
        currency: 'USD',
        pay_frequency: 'monthly',
        organization_id: superAdmin.organization_id,
        is_active: true,
        is_deleted: false
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@chronoshr.com',
        phone: '+1 (555) 234-5678',
        employment_type: 'full_time',
        job_title: 'Product Manager',
        department: 'product',
        work_location: 'remote',
        employee_status: 'active',
        date_of_joining: '2024-02-01',
        salary: 95000.00,
        currency: 'USD',
        pay_frequency: 'monthly',
        organization_id: superAdmin.organization_id,
        is_active: true,
        is_deleted: false
      },
      {
        first_name: 'Michael',
        last_name: 'Brown',
        email: 'michael.brown@chronoshr.com',
        phone: '+1 (555) 345-6789',
        employment_type: 'part_time',
        job_title: 'Marketing Specialist',
        department: 'marketing',
        work_location: 'onsite',
        employee_status: 'active',
        date_of_joining: '2024-03-10',
        salary: 45000.00,
        currency: 'USD',
        pay_frequency: 'monthly',
        organization_id: superAdmin.organization_id,
        is_active: true,
        is_deleted: false
      },
      {
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis@chronoshr.com',
        phone: '+1 (555) 456-7890',
        employment_type: 'contractor',
        job_title: 'UX Designer',
        department: 'design',
        work_location: 'remote',
        employee_status: 'active',
        date_of_joining: '2024-04-05',
        salary: 75000.00,
        currency: 'USD',
        pay_frequency: 'monthly',
        organization_id: superAdmin.organization_id,
        is_active: true,
        is_deleted: false
      },
      {
        first_name: 'David',
        last_name: 'Wilson',
        email: 'david.wilson@chronoshr.com',
        phone: '+1 (555) 567-8901',
        employment_type: 'full_time',
        job_title: 'HR Manager',
        department: 'hr',
        work_location: 'hybrid',
        employee_status: 'active',
        date_of_joining: '2024-01-20',
        salary: 78000.00,
        currency: 'USD',
        pay_frequency: 'monthly',
        organization_id: superAdmin.organization_id,
        is_active: true,
        is_deleted: false
      },
      {
        first_name: 'Lisa',
        last_name: 'Garcia',
        email: 'lisa.garcia@chronoshr.com',
        phone: '+1 (555) 678-9012',
        employment_type: 'full_time',
        job_title: 'Sales Representative',
        department: 'sales',
        work_location: 'onsite',
        employee_status: 'active',
        date_of_joining: '2024-05-12',
        salary: 65000.00,
        currency: 'USD',
        pay_frequency: 'monthly',
        organization_id: superAdmin.organization_id,
        is_active: true,
        is_deleted: false
      }
    ];

    console.log('👥 Inserting sample employees...');
    
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .insert(sampleEmployees)
      .select();

    if (empError) {
      console.error('❌ Error creating employees:', empError);
      return;
    }

    console.log(`✅ Created ${employees.length} sample employees`);

    // Create sample timesheets
    console.log('⏰ Creating sample timesheets...');
    
    const sampleTimesheets = [];
    const today = new Date();
    
    // Create timesheets for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Create 2-3 timesheets per day
      for (let j = 0; j < 2 + (i % 2); j++) {
        const clockIn = new Date(date);
        clockIn.setHours(9 + j, 0, 0, 0);
        
        const clockOut = new Date(clockIn);
        clockOut.setHours(17 + j, 0, 0, 0);
        
        sampleTimesheets.push({
          user_id: employees[j % employees.length].id,
          organization_id: superAdmin.organization_id,
          clock_in: clockIn.toISOString(),
          clock_out: clockOut.toISOString(),
          notes: `Sample timesheet entry ${i + 1}-${j + 1}`
        });
      }
    }

    const { data: timesheets, error: timesheetError } = await supabase
      .from('timesheets')
      .insert(sampleTimesheets)
      .select();

    if (timesheetError) {
      console.error('❌ Error creating timesheets:', timesheetError);
    } else {
      console.log(`✅ Created ${timesheets.length} sample timesheets`);
    }

    console.log('🎉 Sample data creation complete!');
    console.log('📊 Dashboard should now display data');

  } catch (error) {
    console.error('❌ Creation failed:', error);
  }
}

createSampleEmployees(); 