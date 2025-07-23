const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    try {
        console.log('🚀 Starting offline members migration...');
        
        // Read the migration SQL
        const fs = require('fs');
        const migrationSQL = fs.readFileSync('./database/fix_offline_members.sql', 'utf8');
        
        console.log('📝 Migration SQL loaded');
        console.log('🔧 Executing migration...');
        
        // Execute the migration using RPC
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });
        
        if (error) {
            console.error('❌ Migration failed:', error);
            console.log('💡 You may need to run this SQL manually in your Supabase dashboard');
            console.log('📋 SQL to run:');
            console.log(migrationSQL);
        } else {
            console.log('✅ Migration completed successfully');
            console.log('📊 Result:', data);
        }
        
    } catch (error) {
        console.error('❌ Error running migration:', error);
        console.log('💡 Please run the SQL manually in your Supabase dashboard');
    }
}

runMigration(); 