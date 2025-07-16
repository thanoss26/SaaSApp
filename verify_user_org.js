const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserOrg() {
    try {
        console.log('🔍 Verifying user organization_id...');
        
        const userEmail = 'thanosvako23@gmail.com';
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, email, organization_id, role')
            .eq('email', userEmail)
            .single();
        
        if (userError) {
            console.error('❌ Error fetching user:', userError);
            return;
        }
        
        if (!user) {
            console.error('❌ User not found:', userEmail);
            return;
        }
        
        console.log('📋 User details:');
        console.log('- ID:', user.id);
        console.log('- Email:', user.email);
        console.log('- Role:', user.role);
        console.log('- Organization ID:', user.organization_id);
        
        if (user.organization_id) {
            console.log('✅ User has organization_id:', user.organization_id);
            
            // Also check the organization exists
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('id, name')
                .eq('id', user.organization_id)
                .single();
            
            if (orgError) {
                console.error('❌ Error fetching organization:', orgError);
            } else {
                console.log('✅ Organization found:', org.name);
            }
        } else {
            console.log('❌ User still has null organization_id');
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error);
    }
}

verifyUserOrg(); 