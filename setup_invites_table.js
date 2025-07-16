const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupInvitesTable() {
    try {
        console.log('🔧 Setting up invites table...');
        
        // Check if invites table already exists
        const { data: existingTable, error: checkError } = await supabase
            .from('invites')
            .select('id')
            .limit(1);

        if (checkError && checkError.code === '42P01') {
            console.log('📋 Invites table does not exist. Creating it...');
            console.log('⚠️  Please run this SQL manually in your Supabase dashboard:');
            
            console.log('\n```sql');
            console.log('-- Create invites table');
            console.log('CREATE TABLE invites (');
            console.log('    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,');
            console.log('    email VARCHAR(255) NOT NULL,');
            console.log('    first_name VARCHAR(100) NOT NULL,');
            console.log('    last_name VARCHAR(100) NOT NULL,');
            console.log('    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,');
            console.log('    invite_code VARCHAR(50) UNIQUE NOT NULL,');
            console.log('    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,');
            console.log('    is_used BOOLEAN DEFAULT false,');
            console.log('    used_at TIMESTAMP WITH TIME ZONE,');
            console.log('    used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,');
            console.log('    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,');
            console.log('    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
            console.log('    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
            console.log(');');
            console.log('');
            console.log('-- Create index for invite codes');
            console.log('CREATE INDEX idx_invites_code ON invites(invite_code);');
            console.log('CREATE INDEX idx_invites_email ON invites(email);');
            console.log('CREATE INDEX idx_invites_organization ON invites(organization_id);');
            console.log('```');
            
            console.log('\n📋 After creating the table, run this script again to verify it was created successfully.');
            
        } else if (checkError) {
            console.error('❌ Error checking table:', checkError);
        } else {
            console.log('✅ Invites table already exists!');
            
            // Check if there are any invites
            const { data: invites, error: invitesError } = await supabase
                .from('invites')
                .select('id, email, first_name, last_name, is_used')
                .limit(5);
            
            if (invitesError) {
                console.error('❌ Error checking invites:', invitesError);
            } else {
                console.log(`📊 Found ${invites.length} invites in the table:`);
                invites.forEach(invite => {
                    console.log(`   - ${invite.email}: ${invite.first_name} ${invite.last_name} (${invite.is_used ? 'Used' : 'Pending'})`);
                });
            }
        }

        console.log('\n✅ Invites table setup completed!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

setupInvitesTable(); 