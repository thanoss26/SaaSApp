const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireNotificationsAccess } = require('../middleware/auth');
const { sendInvitationAcceptanceEmail } = require('../utils/emailService');

// GET /api/mailbox/invitations - Get user's invitations (no organization required)
router.get('/invitations', authenticateToken, async (req, res) => {
    console.log('📬 GET /api/mailbox/invitations - Fetching user invitations');
    
    try {
        const userId = req.user.id;
        console.log('🔍 User ID:', userId);

        // Get invitations for this user's email
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        console.log('📧 User email:', userProfile.email);

        // Get invitations for this email using admin client to bypass RLS
        const { data: invitations, error: invitationsError } = await supabaseAdmin
            .from('invites')
            .select(`
                *,
                organizations:organization_id (
                    id,
                    name,
                    description
                ),
                created_by_profile:created_by (
                    id,
                    first_name,
                    last_name,
                    email
                )
            `)
            .eq('email', userProfile.email)
            .order('created_at', { ascending: false });

        if (invitationsError) {
            console.error('❌ Error fetching invitations:', invitationsError);
            return res.status(500).json({ error: 'Failed to fetch invitations' });
        }

        console.log('📬 Found invitations:', invitations?.length || 0);

        // Transform the data for frontend
        const transformedInvitations = invitations?.map(invitation => ({
            id: invitation.id,
            email: invitation.email,
            first_name: invitation.first_name,
            last_name: invitation.last_name,
            invite_code: invitation.invite_code,
            expires_at: invitation.expires_at,
            created_at: invitation.created_at,
            updated_at: invitation.updated_at,
            is_used: invitation.is_used,
            used_at: invitation.used_at,
            used_by: invitation.used_by,
            role: invitation.role,
            message: invitation.message,
            status: invitation.is_used ? 'accepted' : 
                   new Date(invitation.expires_at) < new Date() ? 'expired' : 'pending',
            organization_id: invitation.organization_id,
            organization_name: invitation.organizations?.name || 'Unknown Organization',
            created_by: invitation.created_by,
            created_by_name: invitation.created_by_profile ? 
                `${invitation.created_by_profile.first_name} ${invitation.created_by_profile.last_name}` : 
                'Unknown'
        })) || [];

        console.log('✅ Returning invitations:', transformedInvitations.length);
        res.json({ invitations: transformedInvitations });

    } catch (error) {
        console.error('❌ Error in /api/mailbox/invitations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/mailbox/invitations/:id/accept - Accept an invitation (no organization required)
router.post('/invitations/:id/accept', authenticateToken, async (req, res) => {
    console.log('✅ POST /api/mailbox/invitations/:id/accept - Accepting invitation');
    
    try {
        const userId = req.user.id;
        const invitationId = req.params.id;
        
        console.log('🔍 User ID:', userId);
        console.log('🔍 Invitation ID:', invitationId);

        // Get the invitation using admin client to bypass RLS
        const { data: invitation, error: invitationError } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (invitationError || !invitation) {
            console.error('❌ Invitation not found:', invitationError);
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
            console.log('❌ Invitation expired');
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        // Check if invitation is already used
        if (invitation.is_used) {
            console.log('❌ Invitation already used');
            return res.status(400).json({ error: 'Invitation has already been used' });
        }

        // Verify the invitation is for the current user's email
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

        if (profileError || userProfile.email !== invitation.email) {
            console.error('❌ Email mismatch or profile error:', profileError);
            return res.status(403).json({ error: 'You are not authorized to accept this invitation' });
        }

        // Update the invitation to mark it as used using admin client
        const { error: updateError } = await supabaseAdmin
            .from('invites')
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
                used_by: userId
            })
            .eq('id', invitationId);

        if (updateError) {
            console.error('❌ Error updating invitation:', updateError);
            return res.status(500).json({ error: 'Failed to accept invitation' });
        }

        // Update the user's profile to join the organization
        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
                organization_id: invitation.organization_id,
                role: invitation.role || 'organization_member',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (profileUpdateError) {
            console.error('❌ Error updating user profile:', profileUpdateError);
            return res.status(500).json({ error: 'Failed to join organization' });
        }

        // Create an employee record if it doesn't exist
        const { data: existingEmployee, error: employeeCheckError } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (employeeCheckError && employeeCheckError.code !== 'PGRST116') {
            console.error('❌ Error checking employee record:', employeeCheckError);
        }

        if (!existingEmployee) {
            // Create employee record
            const { error: employeeCreateError } = await supabase
                .from('employees')
                .insert({
                    user_id: userId,
                    organization_id: invitation.organization_id,
                    first_name: invitation.first_name,
                    last_name: invitation.last_name,
                    email: invitation.email,
                    position: invitation.role || 'Member',
                    hire_date: new Date().toISOString(),
                    status: 'active'
                });

            if (employeeCreateError) {
                console.error('❌ Error creating employee record:', employeeCreateError);
                // Don't fail the whole operation, just log the error
            }
        }

        // Send email notification to the admin who sent the invitation
        try {
            // Get the admin's profile who sent the invitation
            const { data: adminProfile, error: adminError } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', invitation.created_by)
                .single();

            // Get the user's profile who accepted the invitation
            const { data: userProfile, error: userError } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', userId)
                .single();

            // Get organization details
            const { data: organization, error: orgError } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', invitation.organization_id)
                .single();

            if (!adminError && !userError && !orgError) {
                const emailResult = await sendInvitationAcceptanceEmail(
                    {
                        organization_name: organization.name,
                        role: invitation.role || 'Organization Member'
                    },
                    userProfile,
                    adminProfile
                );

                if (emailResult.success) {
                    console.log('📧 Invitation acceptance email sent to admin');
                } else {
                    console.error('❌ Failed to send invitation acceptance email:', emailResult.error);
                }
            }
        } catch (emailError) {
            console.error('❌ Error sending invitation acceptance email:', emailError);
            // Don't fail the whole operation if email fails
        }

        console.log('✅ Invitation accepted successfully');
        res.json({ 
            message: 'Invitation accepted successfully! You have joined the organization.',
            organization_id: invitation.organization_id,
            role: invitation.role
        });

    } catch (error) {
        console.error('❌ Error in /api/mailbox/invitations/:id/accept:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/mailbox/invitations/:id/decline - Decline an invitation (no organization required)
router.post('/invitations/:id/decline', authenticateToken, async (req, res) => {
    console.log('❌ POST /api/mailbox/invitations/:id/decline - Declining invitation');
    
    try {
        const userId = req.user.id;
        const invitationId = req.params.id;
        
        console.log('🔍 User ID:', userId);
        console.log('🔍 Invitation ID:', invitationId);

        // Get the invitation using admin client to bypass RLS
        const { data: invitation, error: invitationError } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (invitationError || !invitation) {
            console.error('❌ Invitation not found:', invitationError);
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
            console.log('❌ Invitation expired');
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        // Check if invitation is already used
        if (invitation.is_used) {
            console.log('❌ Invitation already used');
            return res.status(400).json({ error: 'Invitation has already been used' });
        }

        // Verify the invitation is for the current user's email
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

        if (profileError || userProfile.email !== invitation.email) {
            console.error('❌ Email mismatch or profile error:', profileError);
            return res.status(403).json({ error: 'You are not authorized to decline this invitation' });
        }

        // Update the invitation to mark it as declined using admin client
        const { error: updateError } = await supabaseAdmin
            .from('invites')
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
                used_by: userId,
                message: invitation.message ? `${invitation.message} [DECLINED]` : '[DECLINED]'
            })
            .eq('id', invitationId);

        if (updateError) {
            console.error('❌ Error updating invitation:', updateError);
            return res.status(500).json({ error: 'Failed to decline invitation' });
        }

        console.log('✅ Invitation declined successfully');
        res.json({ message: 'Invitation declined successfully' });

    } catch (error) {
        console.error('❌ Error in /api/mailbox/invitations/:id/decline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/mailbox/notifications - Get user's notifications (placeholder for future, no organization required)
router.get('/notifications', authenticateToken, requireNotificationsAccess, async (req, res) => {
    console.log('🔔 GET /api/mailbox/notifications - Fetching notifications');
    
    try {
        // For now, return empty notifications
        // This can be expanded later to include system notifications, etc.
        res.json({ notifications: [] });
    } catch (error) {
        console.error('❌ Error in /api/mailbox/notifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 