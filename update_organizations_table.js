const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateOrganizationsTable() {
    try {
        console.log('🔧 Updating organizations table...');
        
        // Check if organizations table exists
        const { data: existingTable, error: checkError } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            console.log('❌ Organizations table does not exist. Please create it first.');
            return;
        }

        console.log('✅ Organizations table exists');

        // Check if additional columns exist
        const { data: columns, error: columnsError } = await supabase
            .from('organizations')
            .select('description, industry, size, website, address')
            .limit(1);

        if (columnsError && columnsError.message.includes('column "description" does not exist')) {
            console.log('📝 Adding missing columns to organizations table...');
            
            // Add the missing columns
            const { error: alterError } = await supabase.rpc('exec_sql', {
                sql: `
                ALTER TABLE organizations 
                ADD COLUMN description TEXT,
                ADD COLUMN industry VARCHAR(100),
                ADD COLUMN size VARCHAR(50),
                ADD COLUMN website VARCHAR(255),
                ADD COLUMN address TEXT;
                `
            });
            
            if (alterError) {
                console.error('❌ Error adding columns:', alterError);
                console.log('Please run this SQL manually in Supabase dashboard:');
                console.log(`
                ALTER TABLE organizations 
                ADD COLUMN description TEXT,
                ADD COLUMN industry VARCHAR(100),
                ADD COLUMN size VARCHAR(50),
                ADD COLUMN website VARCHAR(255),
                ADD COLUMN address TEXT;
                `);
                return;
            }
            
            console.log('✅ Additional columns added to organizations table');
        } else {
            console.log('✅ All required columns already exist in organizations table');
        }

        // Check current organizations
        const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, description, industry, size, website, address')
            .limit(5);

        if (orgsError) {
            console.error('❌ Error fetching organizations:', orgsError);
            return;
        }

        console.log(`📊 Found ${orgs.length} organizations:`);
        orgs.forEach(org => {
            console.log(`   - ${org.name} (${org.id})`);
            console.log(`     Description: ${org.description || 'None'}`);
            console.log(`     Industry: ${org.industry || 'None'}`);
            console.log(`     Size: ${org.size || 'None'}`);
            console.log(`     Website: ${org.website || 'None'}`);
            console.log(`     Address: ${org.address || 'None'}`);
        });

        console.log('\n✅ Organizations table update completed!');

    } catch (error) {
        console.error('❌ Update failed:', error);
    }
}

updateOrganizationsTable(); 