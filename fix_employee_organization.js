const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixEmployeeOrganization() {
  try {
    console.log('🔧 Fixing employee organization assignments...');

    // Get the super_admin user
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

    // Get all employees that don't have an organization_id
    const { data: orphanedEmployees, error: orphanError } = await supabase
      .from('employees')
      .select('*')
      .is('organization_id', null)
      .eq('is_deleted', false);

    if (orphanError) {
      console.error('❌ Error fetching orphaned employees:', orphanError);
      return;
    }

    console.log(`📊 Found ${orphanedEmployees?.length || 0} employees without organization`);

    if (orphanedEmployees && orphanedEmployees.length > 0) {
      console.log('📧 Orphaned employee emails:', orphanedEmployees.map(e => e.email));

      // Update these employees to belong to the super_admin's organization
      const { data: updatedEmployees, error: updateError } = await supabase
        .from('employees')
        .update({ organization_id: superAdmin.organization_id })
        .is('organization_id', null)
        .eq('is_deleted', false)
        .select();

      if (updateError) {
        console.error('❌ Error updating employees:', updateError);
        return;
      }

      console.log(`✅ Updated ${updatedEmployees?.length || 0} employees to organization`);
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
      
      // Create sample timesheets if they don't exist
      const { count: timesheetCount } = await supabase
        .from('timesheets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', superAdmin.organization_id);

      if (timesheetCount === 0) {
        console.log('⏰ Creating sample timesheets for activity data...');
        await createSampleTimesheets(superAdmin.organization_id, orgEmployees);
      } else {
        console.log(`✅ Found ${timesheetCount} existing timesheets`);
      }
    }

    console.log('🎉 Employee organization fix complete!');

  } catch (error) {
    console.error('❌ Fix failed:', error);
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

fixEmployeeOrganization(); 