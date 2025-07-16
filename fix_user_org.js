const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignOrgToUser() {
    try {
        // 1. Find or create a sample organization
        let { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);
        let organizationId;
        if (orgsError) {
            console.error('❌ Error fetching organizations:', orgsError);
            return;
        }
        if (!orgs || orgs.length === 0) {
            const { data: newOrg, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: 'Sample Company',
                    description: 'Sample organization for testing',
                    industry: 'Technology',
                    size: 'medium',
                    website: 'https://example.com',
                    is_active: true
                })
                .select()
                .single();
            if (orgError) {
                console.error('❌ Error creating organization:', orgError);
                return;
            }
            organizationId = newOrg.id;
            console.log('✅ Created new organization:', organizationId);
        } else {
            organizationId = orgs[0].id;
            console.log('✅ Using existing organization:', organizationId);
        }

        // 2. Update the user profile
        const userEmail = 'thanosvako23@gmail.com';
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, organization_id')
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
        if (user.organization_id === organizationId) {
            console.log('✅ User already has correct organization_id');
            return;
        }
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ organization_id: organizationId })
            .eq('id', user.id);
        if (updateError) {
            console.error('❌ Error updating user organization_id:', updateError);
            return;
        }
        console.log('✅ Updated user organization_id successfully!');
    } catch (error) {
        console.error('❌ Script failed:', error);
    }
}

assignOrgToUser(); 