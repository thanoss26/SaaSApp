const { supabaseAdmin } = require('./config/supabase');

async function clearPayrollData() {
    try {
        console.log('🧹 Clearing payroll data...');
        
        // Clear payrolls table
        const { error: payrollsError } = await supabaseAdmin
            .from('payrolls')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (payrollsError) {
            console.error('❌ Error clearing payrolls:', payrollsError);
        } else {
            console.log('✅ Payrolls table cleared');
        }
        
        // Clear payments table (if it exists)
        const { error: paymentsError } = await supabaseAdmin
            .from('payments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (paymentsError) {
            console.log('⚠️ Payments table error (might not exist):', paymentsError.message);
        } else {
            console.log('✅ Payments table cleared');
        }
        
        // Clear stripe_payments table (if it exists)
        const { error: stripePaymentsError } = await supabaseAdmin
            .from('stripe_payments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (stripePaymentsError) {
            console.log('⚠️ Stripe payments table error (might not exist):', stripePaymentsError.message);
        } else {
            console.log('✅ Stripe payments table cleared');
        }
        
        // Verify tables are empty
        const { data: payrollsCount, error: countError1 } = await supabaseAdmin
            .from('payrolls')
            .select('id', { count: 'exact' });
        
        const { data: paymentsCount, error: countError2 } = await supabaseAdmin
            .from('payments')
            .select('id', { count: 'exact' });
        
        const { data: stripePaymentsCount, error: countError3 } = await supabaseAdmin
            .from('stripe_payments')
            .select('id', { count: 'exact' });
        
        console.log('\n📊 Verification Results:');
        console.log(`Payrolls: ${payrollsCount?.length || 0} records`);
        console.log(`Payments: ${paymentsCount?.length || 0} records`);
        console.log(`Stripe Payments: ${stripePaymentsCount?.length || 0} records`);
        
        console.log('\n✅ Payroll data cleared successfully!');
        
    } catch (error) {
        console.error('❌ Error clearing payroll data:', error);
    }
}

clearPayrollData(); 