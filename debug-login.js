const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugLogin() {
    console.log('🔍 Debugging Login Issue...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
        console.log('❌ Missing Supabase credentials in .env file');
        return;
    }
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
    console.log('');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Check if we can connect to Supabase
    console.log('1. Testing basic connection...');
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });
            
        if (error) {
            console.log('❌ Connection error:', error.message);
            console.log('Error details:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Basic connection works');
        }
    } catch (err) {
        console.log('❌ Connection failed:', err.message);
    }
    
    // Test 2: Try to create a test user with a real email domain
    console.log('\n2. Testing user creation...');
    const testEmail = `test-${Date.now()}@gmail.com`;
    const testPassword = 'testpassword123';
    
    console.log('Using test email:', testEmail);
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });
        
        if (error) {
            console.log('❌ User creation error:', error.message);
            console.log('Error code:', error.status);
            console.log('Error details:', JSON.stringify(error, null, 2));
            
            // Check if it's an email restriction issue
            if (error.status === 400 && error.message.includes('invalid')) {
                console.log('\n💡 This suggests your Supabase project has email restrictions.');
                console.log('Please check your Supabase project settings:');
                console.log('1. Go to Authentication > Settings');
                console.log('2. Check "Enable email confirmations" and "Enable email change confirmations"');
                console.log('3. Check if there are any email domain restrictions');
            }
        } else {
            console.log('✅ Test user created successfully');
            console.log('User ID:', data.user.id);
            
            // Test 3: Try to login with the test user
            console.log('\n3. Testing login with test user...');
            
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword
            });
            
            if (loginError) {
                console.log('❌ Login error:', loginError.message);
                console.log('Error details:', JSON.stringify(loginError, null, 2));
            } else {
                console.log('✅ Login successful');
                console.log('Session:', loginData.session ? 'Created' : 'None');
                
                // Test 4: Try to access profile
                console.log('\n4. Testing profile access...');
                
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', loginData.user.id)
                    .single();
                
                if (profileError) {
                    console.log('❌ Profile access error:', profileError.message);
                    console.log('Error details:', JSON.stringify(profileError, null, 2));
                } else {
                    console.log('✅ Profile access successful');
                    console.log('Profile:', profileData);
                }
            }
            
            // Clean up: Delete test user
            console.log('\n5. Cleaning up test user...');
            const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
            if (deleteError) {
                console.log('⚠️ Could not delete test user:', deleteError.message);
            } else {
                console.log('✅ Test user deleted');
            }
        }
    } catch (err) {
        console.log('❌ Test failed:', err.message);
        console.log('Error details:', JSON.stringify(err, null, 2));
    }
}

debugLogin(); 