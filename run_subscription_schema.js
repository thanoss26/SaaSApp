require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Create Supabase client with service role key
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSubscriptionSchema() {
    try {
        console.log('📋 Running subscription schema...');
        
        // Read the SQL file
        const sql = fs.readFileSync('database/subscription_schema.sql', 'utf8');
        
        // Split the SQL into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i].trim();
            if (statement) {
                console.log(`🔧 Executing statement ${i + 1}/${statements.length}...`);
                
                const { error } = await supabase.rpc('exec_sql', { sql: statement });
                
                if (error) {
                    console.error(`❌ Error executing statement ${i + 1}:`, error);
                    // Continue with other statements
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                }
            }
        }
        
        console.log('✅ Subscription schema completed successfully!');
        
    } catch (error) {
        console.error('❌ Error running subscription schema:', error);
    }
}

runSubscriptionSchema(); 