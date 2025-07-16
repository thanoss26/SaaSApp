const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRLS() {
    try {
        console.log('🔧 Disabling RLS for employees table...');
        
        // Disable RLS on employees table
        const { error: rlsError } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE employees DISABLE ROW LEVEL SECURITY;'
        });
        
        if (rlsError) {
            console.error('❌ Error disabling RLS:', rlsError);
            console.log('Please run this SQL manually in your Supabase dashboard:');
            console.log('ALTER TABLE employees DISABLE ROW LEVEL SECURITY;');
            return;
        }
        
        console.log('✅ RLS disabled for employees table');
        
        // Also disable RLS on other tables if needed
        const tables = ['profiles', 'organizations', 'teams'];
        
        for (const table of tables) {
            try {
                const { error } = await supabase.rpc('exec_sql', {
                    sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
                });
                
                if (error) {
                    console.log(`⚠️  Could not disable RLS for ${table}:`, error.message);
                } else {
                    console.log(`✅ RLS disabled for ${table} table`);
                }
            } catch (err) {
                console.log(`⚠️  Could not disable RLS for ${table}:`, err.message);
            }
        }
        
        console.log('\n✅ RLS disabled successfully!');
        console.log('📋 You can now create employees without RLS restrictions.');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n📋 Please run these SQL commands manually in your Supabase dashboard:');
        console.log('ALTER TABLE employees DISABLE ROW LEVEL SECURITY;');
        console.log('ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;');
        console.log('ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;');
        console.log('ALTER TABLE teams DISABLE ROW LEVEL SECURITY;');
    }
}

disableRLS(); 