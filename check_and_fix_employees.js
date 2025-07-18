const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixEmployees() {
  try {
    console.log('🔧 Checking and fixing employees...');

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

    // Get all employees
    const { data: allEmployees, error: allError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_deleted', false);

    if (allError) {
      console.error('❌ Error fetching employees:', allError);
      return;
    }

    console.log(`📊 Found ${allEmployees?.length || 0} total employees`);

    if (allEmployees && allEmployees.length > 0) {
      console.log('📧 All employee emails:', allEmployees.map(e => e.email));
      console.log('🏢 Employee organization IDs:', allEmployees.map(e => e.organization_id));

      // Find employees without organization_id
      const orphanedEmployees = allEmployees.filter(emp => !emp.organization_id);
      console.log(`📊 Found ${orphanedEmployees.length} employees without organization`);

      if (orphanedEmployees.length > 0) {
        console.log('📧 Orphaned employee emails:', orphanedEmployees.map(e => e.email));

        // Update orphaned employees to belong to super_admin's organization
        const { data: updatedEmployees, error: updateError } = await supabase
          .from('employees')
          .update({ organization_id: superAdmin.organization_id })
          .in('id', orphanedEmployees.map(e => e.id))
          .select();

        if (updateError) {
          console.error('❌ Error updating employees:', updateError);
          return;
        }

        console.log(`✅ Updated ${updatedEmployees?.length || 0} employees to organization`);
      }
    }

    // Check employees in the organization now
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

    console.log('🎉 Employee check and fix complete!');

  } catch (error) {
    console.error('❌ Check failed:', error);
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

checkAndFixEmployees(); 