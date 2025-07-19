const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
    console.log('🔧 Checking existing tables...');
    
    try {
        // Try to query different tables to see what exists
        const tablesToCheck = [
            'profiles',
            'organizations', 
            'employees',
            'payrolls',
            'invites',
            'users'
        ];
        
        for (const tableName of tablesToCheck) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                    
                if (error) {
                    console.log(`❌ Table ${tableName}: ${error.message}`);
                } else {
                    console.log(`✅ Table ${tableName}: exists`);
                }
            } catch (err) {
                console.log(`❌ Table ${tableName}: ${err.message}`);
            }
        }
        
        // Try to create a test payroll to see what happens
        console.log('\n🧪 Testing payroll creation...');
        
        const testPayroll = {
            payroll_id: 'TEST123',
            employee_id: '4cddfe56-573f-476e-801a-6e8276962a72',
            organization_id: '518fe5ae-2c39-46c6-8cbe-171167d07ff3',
            pay_period: 'weekly',
            start_date: '2025-07-19',
            end_date: '2025-07-26',
            base_salary: 100,
            bonus: 0,
            reimbursement: 0,
            deductions: 0,
            total_amount: 100,
            status: 'pending',
            notes: 'Test payroll',
            created_by: '104051c7-5c90-4b94-a9d6-6a22dec0d8c1'
        };
        
        const { data: insertResult, error: insertError } = await supabase
            .from('payrolls')
            .insert(testPayroll)
            .select();
            
        if (insertError) {
            console.log('❌ Payroll insertion error:', insertError);
        } else {
            console.log('✅ Payroll inserted successfully:', insertResult);
            
            // Clean up
            const { error: deleteError } = await supabase
                .from('payrolls')
                .delete()
                .eq('payroll_id', 'TEST123');
                
            if (deleteError) {
                console.log('⚠️ Could not delete test payroll:', deleteError.message);
            } else {
                console.log('✅ Test payroll cleaned up');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkTables(); 