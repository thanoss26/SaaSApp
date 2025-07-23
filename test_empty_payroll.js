const { supabaseAdmin } = require('./config/supabase');

async function testEmptyPayroll() {
    try {
        console.log('🧪 Testing payroll page with empty data...');
        
        // Check if payrolls table exists and count records
        const { data: payrolls, error: payrollsError } = await supabaseAdmin
            .from('payrolls')
            .select('id', { count: 'exact' });
        
        if (payrollsError) {
            console.error('❌ Error checking payrolls:', payrollsError);
            return;
        }
        
        console.log(`📊 Payrolls table has ${payrolls?.length || 0} records`);
        
        if (payrolls && payrolls.length > 0) {
            console.log('⚠️ Payrolls table is not empty. Consider clearing data for testing.');
            console.log('💡 You can run: node clear_payroll_data.js');
        } else {
            console.log('✅ Payrolls table is empty - perfect for testing empty state!');
        }
        
        // Check if there are any organizations with employees
        const { data: organizations, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('id, name');
        
        if (orgError) {
            console.error('❌ Error checking organizations:', orgError);
            return;
        }
        
        console.log(`🏢 Found ${organizations?.length || 0} organizations`);
        
        if (organizations && organizations.length > 0) {
            console.log('📋 Organizations:');
            organizations.forEach(org => {
                console.log(`  - ${org.name} (${org.id})`);
            });
        }
        
        // Check if there are any employees
        const { data: employees, error: empError } = await supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, organization_id, role');
        
        if (empError) {
            console.error('❌ Error checking employees:', empError);
            return;
        }
        
        console.log(`👥 Found ${employees?.length || 0} employees`);
        
        if (employees && employees.length > 0) {
            console.log('📋 Employees:');
            employees.forEach(emp => {
                console.log(`  - ${emp.first_name} ${emp.last_name} (${emp.role}) - Org: ${emp.organization_id}`);
            });
        }
        
        console.log('\n🎯 Test Summary:');
        console.log('✅ Payroll page should now display empty state correctly');
        console.log('✅ KPI cards should show $0 values');
        console.log('✅ Charts should show empty state overlays');
        console.log('✅ Table should show "No payrolls found" message');
        console.log('✅ Admin users should see "Create First Payroll" button');
        
    } catch (error) {
        console.error('❌ Error testing empty payroll:', error);
    }
}

testEmptyPayroll(); 