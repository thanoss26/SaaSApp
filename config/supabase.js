const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase Configuration:');
console.log('URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('Anon Key:', supabaseAnonKey ? 'SET' : 'MISSING');
console.log('Service Role Key:', supabaseServiceKey ? 'SET' : 'MISSING');

// Check each variable individually for better error messages
if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL environment variable');
  console.error('🔧 Please set SUPABASE_URL in your environment variables');
}
if (!supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_ANON_KEY environment variable');
  console.error('🔧 Please set SUPABASE_ANON_KEY in your environment variables');
}
if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('🔧 Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables');
}

// Don't throw error, just log warnings
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('⚠️  Supabase configuration incomplete - some features may not work');
  console.error('📋 Required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_ANON_KEY');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
}

// Client for user operations (with RLS)
let supabase = null;
let supabaseAdmin = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client initialized');
} else {
  console.log('⚠️  Supabase client not initialized - missing URL or anon key');
}

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase admin client initialized');
} else {
  console.log('⚠️  Supabase admin client not initialized - missing URL or service key');
}

module.exports = {
  supabase,
  supabaseAdmin
}; 