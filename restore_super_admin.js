// Script to restore super_admin role
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreSuperAdmin() {
    const userId = '778806f4-bcdd-4818-95e9-66683f23c3f4';
    
    try {
        console.log(`🔄 Restoring super_admin role for user ${userId}...`);
        
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: 'super_admin' })
            .eq('id', userId)
            .select();
            
        if (error) {
            console.error('❌ Error restoring role:', error);
            return;
        }
        
        console.log('✅ Super admin role restored successfully:', data);
        
    } catch (error) {
        console.error('❌ Failed to restore role:', error);
    }
}

if (require.main === module) {
    restoreSuperAdmin();
} 