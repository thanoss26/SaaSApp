const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceUpdateUser() {
    try {
        console.log('🔧 Force updating user organization_id...');
        
        // Get organization ID
        let { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .limit(1);
        
        if (orgsError || !orgs || orgs.length === 0) {
            console.error('❌ No organizations found');
            return;
        }
        
        const organizationId = orgs[0].id;
        console.log('✅ Using organization:', orgs[0].name, organizationId);
        
        // Force update user
        const userEmail = 'thanosvako23@gmail.com';
        const { data: updateResult, error: updateError } = await supabase
            .from('profiles')
            .update({ 
                organization_id: organizationId,
                updated_at: new Date().toISOString()
            })
            .eq('email', userEmail)
            .select('id, email, organization_id, role, updated_at');
        
        if (updateError) {
            console.error('❌ Error updating user:', updateError);
            return;
        }
        
        if (!updateResult || updateResult.length === 0) {
            console.error('❌ No user found to update');
            return;
        }
        
        console.log('✅ User updated successfully:');
        console.log('- ID:', updateResult[0].id);
        console.log('- Email:', updateResult[0].email);
        console.log('- Organization ID:', updateResult[0].organization_id);
        console.log('- Role:', updateResult[0].role);
        console.log('- Updated at:', updateResult[0].updated_at);
        
        // Verify the update
        console.log('🔍 Verifying update...');
        const { data: verifyUser, error: verifyError } = await supabase
            .from('profiles')
            .select('id, email, organization_id, role')
            .eq('email', userEmail)
            .single();
        
        if (verifyError) {
            console.error('❌ Error verifying user:', verifyError);
            return;
        }
        
        console.log('✅ Verification successful:');
        console.log('- Organization ID:', verifyUser.organization_id);
        
        if (verifyUser.organization_id === organizationId) {
            console.log('🎉 User organization_id is correctly set!');
            console.log('📋 Next steps:');
            console.log('1. Clear your browser cache and cookies');
            console.log('2. Log out and log back in');
            console.log('3. Try creating a new employee');
        } else {
            console.log('❌ Organization ID mismatch!');
        }
        
    } catch (error) {
        console.error('❌ Force update failed:', error);
    }
}

forceUpdateUser(); 