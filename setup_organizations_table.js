const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOrganizationsTable() {
    try {
        console.log('Setting up organizations table...');

        // Check if organizations table exists
        const { data: existingTable, error: checkError } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === 'PGRST116') {
            console.log('Organizations table does not exist, creating it...');
            
            // Since we can't create tables directly with the client, 
            // we'll just create a sample organization to test the functionality
            console.log('Creating sample organization...');
            
            const { data: sampleOrg, error: createError } = await supabase
                .from('organizations')
                .insert({
                    name: 'Sample Organization',
                    description: 'A sample organization for testing',
                    email: 'sample@example.com',
                    is_active: true
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating sample organization:', createError);
                console.log('You may need to create the organizations table manually in Supabase dashboard');
                return;
            }

            console.log('✅ Sample organization created successfully:', sampleOrg);
        } else {
            console.log('✅ Organizations table already exists');
            
            // Check if there are any organizations
            const { data: orgs, error: listError } = await supabase
                .from('organizations')
                .select('*');

            if (listError) {
                console.error('Error listing organizations:', listError);
            } else {
                console.log(`Found ${orgs.length} organizations`);
            }
        }

        console.log('🎉 Organizations setup completed!');

    } catch (error) {
        console.error('Error setting up organizations:', error);
    }
}

setupOrganizationsTable(); 