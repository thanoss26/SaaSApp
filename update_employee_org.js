const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateEmployeeOrg() {
  try {
    console.log('🔧 Updating employee organization...');

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

    // Get the existing employee
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'thanosvakopaoki@gmail.com')
      .single();

    if (empError) {
      console.error('❌ Error fetching employee:', empError);
      return;
    }

    console.log('👤 Found employee:', employee.email);
    console.log('🏢 Current organization ID:', employee.organization_id);

    // Update the employee to belong to super_admin's organization
    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employees')
      .update({ organization_id: superAdmin.organization_id })
      .eq('id', employee.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating employee:', updateError);
      return;
    }

    console.log('✅ Updated employee organization to:', updatedEmployee.organization_id);

    // Create some additional sample employees
    console.log('👥 Creating additional sample employees...');
    
    const additionalEmployees = [
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
      }
    ];

    const { data: newEmployees, error: newEmpError } = await supabase
      .from('employees')
      .insert(additionalEmployees)
      .select();

    if (newEmpError) {
      console.error('❌ Error creating additional employees:', newEmpError);
    } else {
      console.log(`✅ Created ${newEmployees.length} additional employees`);
    }

    // Get all employees in the organization now
    const { data: orgEmployees, error: orgError } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', superAdmin.organization_id)
      .eq('is_deleted', false);

    if (orgError) {
      console.error('❌ Error fetching organization employees:', orgError);
      return;
    }

    console.log(`📊 Total employees in organization: ${orgEmployees?.length || 0}`);

    if (orgEmployees && orgEmployees.length > 0) {
      console.log('📧 Organization employee emails:', orgEmployees.map(e => e.email));
      
      // Create sample timesheets
      console.log('⏰ Creating sample timesheets...');
      await createSampleTimesheets(superAdmin.organization_id, orgEmployees);
    }

    console.log('🎉 Employee organization update complete!');

  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

async function createSampleTimesheets(organizationId, employees) {
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
        organization_id: organizationId,
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
}

updateEmployeeOrg(); 