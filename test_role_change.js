// Test script to change user role for testing organization requirements
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function changeUserRole(userId, newRole) {
    try {
        console.log(`🔄 Changing user ${userId} role to ${newRole}...`);
        
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)
            .select();
            
        if (error) {
            console.error('❌ Error updating role:', error);
            return;
        }
        
        console.log('✅ Role updated successfully:', data);
        
    } catch (error) {
        console.error('❌ Failed to update role:', error);
    }
}

async function removeUserOrganization(userId) {
    try {
        console.log(`🔄 Removing organization from user ${userId}...`);
        
        const { data, error } = await supabase
            .from('profiles')
            .update({ organization_id: null })
            .eq('id', userId)
            .select();
            
        if (error) {
            console.error('❌ Error removing organization:', error);
            return;
        }
        
        console.log('✅ Organization removed successfully:', data);
        
    } catch (error) {
        console.error('❌ Failed to remove organization:', error);
    }
}

// Your user ID from the server logs
const userId = '778806f4-bcdd-4818-95e9-66683f23c3f4';

async function testRoleChange() {
    console.log('🧪 Testing role change for organization requirements...\n');
    
    // Change to admin role and remove organization
    await changeUserRole(userId, 'admin');
    await removeUserOrganization(userId);
    
    console.log('\n✅ User is now admin without organization - test the organization requirement!');
    console.log('📝 To restore super_admin role, run: node restore_super_admin.js');
}

if (require.main === module) {
    testRoleChange();
} 