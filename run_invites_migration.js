const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runInvitesMigration() {
    console.log('🚀 Running invites table migration...');
    
    try {
        // Read the SQL file
        const fs = require('fs');
        const sqlPath = './database/invites_schema.sql';
        
        if (!fs.existsSync(sqlPath)) {
            console.error('❌ SQL file not found:', sqlPath);
            process.exit(1);
        }
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('📄 SQL file loaded successfully');
        
        // Execute the SQL
        console.log('🔧 Executing SQL migration...');
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        
        if (error) {
            // If exec_sql doesn't exist, try direct query
            console.log('⚠️  exec_sql not available, trying direct query...');
            
            // Split SQL into individual statements
            const statements = sql.split(';').filter(stmt => stmt.trim());
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i].trim();
                if (statement) {
                    console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
                    const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
                    
                    if (stmtError) {
                        console.log('⚠️  Statement failed (might already exist):', stmtError.message);
                    } else {
                        console.log('✅ Statement executed successfully');
                    }
                }
            }
        } else {
            console.log('✅ Migration completed successfully');
        }
        
        // Verify the table was created
        console.log('🔍 Verifying table creation...');
        const { data: tableCheck, error: tableError } = await supabase
            .from('invites')
            .select('id')
            .limit(1);
        
        if (tableError) {
            console.error('❌ Table verification failed:', tableError.message);
            console.log('');
            console.log('📋 Manual steps required:');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Copy and paste the contents of database/invites_schema.sql');
            console.log('4. Execute the SQL');
        } else {
            console.log('✅ Invites table verified successfully!');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('');
        console.log('📋 Manual steps required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of database/invites_schema.sql');
        console.log('4. Execute the SQL');
    }
}

// Run the migration
runInvitesMigration(); 