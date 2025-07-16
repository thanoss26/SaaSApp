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
  throw new Error('Missing SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}
if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Client for user operations (with RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for bypassing RLS (use carefully)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ Supabase clients initialized successfully');

module.exports = {
  supabase,
  supabaseAdmin
}; 