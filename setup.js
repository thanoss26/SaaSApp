const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase Connection...\n');
    
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment Variables:');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    console.log('');
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        console.log('❌ Missing required environment variables!');
        console.log('Please create a .env file with your Supabase credentials.');
        return;
    }
    
    try {
        // Test regular client
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        console.log('Testing regular client connection...');
        
        const { data, error } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            console.log('❌ Regular client error:', error.message);
        } else {
            console.log('✅ Regular client working');
        }
        
        // Test admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        console.log('Testing admin client connection...');
        
        const { data: adminData, error: adminError } = await supabaseAdmin
            .from('profiles')
            .select('count', { count: 'exact', head: true });
            
        if (adminError) {
            console.log('❌ Admin client error:', adminError.message);
        } else {
            console.log('✅ Admin client working');
        }
        
        // Test if tables exist
        console.log('\nChecking database tables...');
        
        const tables = ['profiles', 'organizations', 'messages', 'timesheets'];
        
        for (const table of tables) {
            try {
                const { error } = await supabaseAdmin
                    .from(table)
                    .select('*')
                    .limit(1);
                    
                if (error) {
                    console.log(`❌ Table '${table}': ${error.message}`);
                } else {
                    console.log(`✅ Table '${table}': Exists`);
                }
            } catch (err) {
                console.log(`❌ Table '${table}': ${err.message}`);
            }
        }
        
        console.log('\n🎉 Setup check complete!');
        console.log('\nIf you see any ❌ errors, please:');
        console.log('1. Make sure your .env file has correct Supabase credentials');
        console.log('2. Run the database schema in your Supabase SQL editor');
        console.log('3. Check that your Supabase project is active');
        
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
    }
}

// Run the test
testSupabaseConnection(); 