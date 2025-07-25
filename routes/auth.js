const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireInvitePermission, requireInviteUsersAccess } = require('../middleware/auth');
const router = express.Router();

// Helper function to determine user role based on email
const determineUserRole = (email) => {
  // Only thanosvako23@gmail.com gets super_admin access
  if (email === 'thanosvako23@gmail.com') {
    return 'super_admin';
  }
  // Everyone else gets admin access
  return 'admin';
};

// Helper function to check if user can promote to role
const canPromoteToRole = (currentUserRole, targetRole) => {
  const roleHierarchy = {
    'super_admin': ['super_admin', 'admin', 'manager', 'organization_member'],
    'admin': ['admin', 'manager', 'organization_member'],
    'manager': ['manager', 'organization_member'],
    'organization_member': []
  };
  
  return roleHierarchy[currentUserRole]?.includes(targetRole) || false;
};

// Helper function to generate 6-digit join code
const generateJoinCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').trim().isLength({ min: 1, max: 100 }),
  body('last_name').trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) {
      console.error('❌ User creation failed:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const user = authData.user;
    const role = determineUserRole(email);
    
    console.log('✅ New user created successfully:');
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);
    console.log('Assigned Role:', role);

    // Create profile record
    const profileData = {
      id: user.id,
      email,
      first_name,
      last_name,
      role,
      organization_id: null // Will be set when joining organization
    };

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert(profileData);

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(500).json({ error: 'Failed to create user profile: ' + profileError.message });
    }

    // Admin users can create organizations later
    // They start without an organization and can create one from the dashboard

    // Sign in the user to get a session token using a fresh client instance
    // This prevents session conflicts on the server
    const { createClient } = require('@supabase/supabase-js');
    const freshSupabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const { data: signInData, error: signInError } = await freshSupabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Auto-login after registration failed:', signInError);
      // Still return success, user can log in manually
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email,
          first_name,
          last_name,
          role
        },
        requiresJoinCode: false
      });
    }

    // Fetch the complete user profile from the database using admin client
    // This ensures no session conflicts with the sign-in operation
    console.log('🔍 Fetching profile for newly registered user ID:', user.id);
    
    const { data: newUserProfile, error: newProfileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('New user profile fetch result - Data:', newUserProfile);
    console.log('New user profile fetch result - Error:', newProfileError);
    
    // Security check: Ensure the profile belongs to the newly created user
    if (newUserProfile && newUserProfile.id !== user.id) {
      console.error('🚨 SECURITY ALERT: Profile ID mismatch!');
      console.error('Expected user ID:', user.id);
      console.error('Received profile ID:', newUserProfile.id);
      console.error('This indicates a serious session or database issue!');
      
      return res.status(500).json({ 
        error: 'Registration failed - security check failed',
        message: 'Please try again or contact support'
      });
    }
    
    if (newProfileError) {
      console.log('❌ New user profile fetch failed:', newProfileError.message);
      // Fallback to basic user data
      return res.status(201).json({
        message: 'User registered and logged in successfully',
        token: signInData.session.access_token,
        userEmail: email,
        user: {
          id: user.id,
          email,
          first_name,
          last_name,
          role
        },
        requiresJoinCode: false
      });
    }

    console.log('✅ New user profile fetched successfully:', newUserProfile);

    res.status(201).json({
      message: 'User registered and logged in successfully',
      token: signInData.session.access_token,
      userEmail: email,
      user: {
        id: newUserProfile.id,
        email: newUserProfile.email,
        first_name: newUserProfile.first_name,
        last_name: newUserProfile.last_name,
        role: newUserProfile.role,
        organization_id: newUserProfile.organization_id
      },
      requiresJoinCode: false
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    console.log('🔍 Login attempt for email:', email);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('❌ Authentication failed:', error.message);
      console.log('Auth error details:', JSON.stringify(error, null, 2));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Authentication successful');
    console.log('User ID from auth:', data.user.id);
    console.log('Session created:', !!data.session);

    // Get user profile
    console.log('🔍 Fetching profile for user ID:', data.user.id);
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    console.log('Profile fetch result - Data:', profile);
    console.log('Profile fetch result - Error:', profileError);
    
    if (profileError) {
      console.log('❌ Profile fetch failed:', profileError.message);
      console.log('Profile error details:', JSON.stringify(profileError, null, 2));
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    console.log('✅ Profile fetched successfully:', profile);

    const responseData = {
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        organization_id: profile.organization_id
      },
      token: data.session.access_token,
      refresh_token: data.session.refresh_token
    };
    
    console.log('📤 Sending login response:', {
      message: responseData.message,
      userEmail: responseData.user.email,
      hasToken: !!responseData.token,
      tokenLength: responseData.token ? responseData.token.length : 0
    });
    
    res.json(responseData);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Join organization with code
router.post('/join-organization', authenticateToken, [
  body('join_code').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { join_code } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Find organization by join code
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('join_code', join_code)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    // Update user profile with organization_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        organization_id: organization.id,
        role: 'organization_member'
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to join organization' });
    }

    res.json({
      message: 'Successfully joined organization',
      organization: {
        id: organization.id,
        name: organization.name
      }
    });

  } catch (error) {
    console.error('Join organization error:', error);
    res.status(500).json({ error: 'Failed to join organization' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log('📡 Profile endpoint hit');
    const userId = req.user?.id;
    console.log('🔍 User ID from token:', userId);

    if (!userId) {
      console.log('❌ No user ID found in token');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🔍 Fetching profile for user:', userId);
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('📥 Profile fetch result - Data:', profile);
    console.log('📥 Profile fetch result - Error:', error);

    if (error) {
      console.log('❌ Profile fetch failed:', error.message);
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('✅ Profile endpoint returning data');
    res.json({ profile });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('last_name').optional().trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { first_name, last_name } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;

    const { data: profile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Promote user role (admin/super_admin only)
router.post('/promote-user', authenticateToken, [
  body('userId').isUUID(),
  body('newRole').isIn(['admin', 'manager', 'organization_member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, newRole } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get current user's profile to check role
    const { data: currentProfile, error: profileError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch current user profile' });
    }

    // Check if user can promote to this role
    if (!canPromoteToRole(currentProfile.role, newRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to promote to this role' });
    }

    // Get target user's profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (targetError) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Super admin can promote anyone, others can only promote within their organization
    if (currentProfile.role !== 'super_admin' && targetProfile.organization_id !== currentProfile.organization_id) {
      return res.status(403).json({ error: 'Can only promote users within your organization' });
    }

    // Prevent self-promotion
    if (userId === currentUser.id) {
      return res.status(400).json({ error: 'Cannot promote yourself' });
    }

    // Update user role
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user role' });
    }

    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        role: updatedProfile.role
      }
    });

  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Get role descriptions
router.get('/roles', async (req, res) => {
  try {
    const { data: roles, error } = await supabase
      .from('role_descriptions')
      .select('*')
      .order('role');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch role descriptions' });
    }

    res.json({ roles });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Verify token and get user info
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      user: {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        organization_id: profile.organization_id
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// Create organization (admin only)
router.post('/create-organization', authenticateToken, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    console.log('🔍 Create organization request received');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    console.log('🔍 Using user ID:', userId);
    
    if (!userId) {
      console.log('❌ No user ID available');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single();

    console.log('🔍 Profile fetch result:', { profile, error: profileError });

    if (profileError) {
      console.log('❌ Profile fetch error:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // Only admins can create organizations
    if (profile.role !== 'admin') {
      console.log('❌ User role not admin:', profile.role);
      return res.status(403).json({ error: 'Only admins can create organizations' });
    }

    // Check if user already has an organization
    if (profile.organization_id) {
      console.log('❌ User already has organization:', profile.organization_id);
      return res.status(400).json({ error: 'User already belongs to an organization' });
    }

    const { name, description } = req.body;
    const joinCode = generateJoinCode();
    
    console.log('🔍 Creating organization with:', { name, description, joinCode });

    // Create organization with organization_creator field
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        description: description || null,
        join_code: joinCode,
        organization_creator: userId
      })
      .select()
      .single();

    console.log('🔍 Organization creation result:', { organization, error: orgError });

    if (orgError) {
      console.log('❌ Organization creation error:', orgError);
      
      // If the error is about organization_creator field not existing, try without it
      if (orgError.message && orgError.message.includes('organization_creator')) {
        console.log('🔄 Trying without organization_creator field...');
        
        const { data: organization2, error: orgError2 } = await supabase
          .from('organizations')
          .insert({
            name,
            description: description || null,
            join_code: joinCode
          })
          .select()
          .single();
          
        console.log('🔍 Organization creation result (without creator):', { organization2, error: orgError2 });
        
        if (orgError2) {
          console.log('❌ Organization creation still failed:', orgError2);
          return res.status(500).json({ error: 'Failed to create organization: ' + orgError2.message });
        }
        
        // Use the second result
        organization = organization2;
      } else {
        return res.status(500).json({ error: 'Failed to create organization: ' + orgError.message });
      }
    }

    // Update user profile with organization_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ organization_id: organization.id })
      .eq('id', userId);

    console.log('🔍 Profile update result:', { error: updateError });

    if (updateError) {
      console.log('❌ Profile update error:', updateError);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    console.log('✅ Organization created successfully');
    res.status(201).json({
      message: 'Organization created successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        join_code: organization.join_code
      }
    });

  } catch (error) {
    console.error('❌ Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Generate invite link for employee (admin/super_admin only)
router.post('/generate-invite', authenticateToken, requireInviteUsersAccess, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user profile to check role and organization
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // Only admins can generate invites
    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admins can generate invites' });
    }

    if (!profile.organization_id) {
      return res.status(400).json({ error: 'You must belong to an organization to generate invites' });
    }

    // Check if this is a generic invite link generation (for shareable links)
    if (req.body.role && req.body.expiry_days && !req.body.email) {
      const { role, expiry_days } = req.body;
      
      // Generate unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expiry_days || 7)); // Default to 7 days

      // Create generic invite record
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .insert({
          organization_id: profile.organization_id,
          email: 'generic@invite.local', // Placeholder email for generic invites
          first_name: 'Generic', // Placeholder first name
          last_name: 'Invite', // Placeholder last name
          role: role || 'organization_member',
          invite_code: inviteCode,
          expires_at: expiresAt.toISOString(),
          created_by: userId
        })
        .select()
        .single();

      if (inviteError) {
        return res.status(500).json({ error: 'Failed to create invite: ' + inviteError.message });
      }

      // Generate invite link - use dynamic base URL
      const baseUrl = process.env.FRONTEND_URL || 
                     (process.env.NODE_ENV === 'production' ? 'https://chronoshr.onrender.com' : 'http://localhost:3000');
      const inviteLink = `${baseUrl}/invite/${inviteCode}`;

      res.status(201).json({
        message: 'Invite link generated successfully',
        invite_link: inviteLink,
        invite_code: inviteCode,
        expires_at: invite.expires_at,
        role: invite.role
      });
      
      return;
    }

    // Email-based invitation validation
    const { email, first_name, last_name, role, message } = req.body;

    if (!email || !first_name || !last_name) {
      return res.status(400).json({ error: 'Email, first name, and last name are required for email invitations' });
    }

    // Check if user already exists - but allow invitations to existing users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', email)
      .single();

    console.log('🔍 Checking existing user for email:', email);
    console.log('🔍 Existing user data:', existingUser);
    console.log('🔍 Current user organization:', profile.organization_id);

    // If user exists and already belongs to an organization, check if it's the same organization
    if (existingUser && existingUser.organization_id) {
      if (existingUser.organization_id === profile.organization_id) {
        console.log('❌ User already belongs to this organization');
        return res.status(400).json({ 
          error: 'User is already a member of this organization',
          details: 'This email address is already associated with a member of your organization. Please use a different email address or contact the existing member directly.'
        });
      } else {
        console.log('❌ User belongs to different organization');
        return res.status(400).json({ 
          error: 'User already belongs to another organization',
          details: 'This email address is already associated with a member of another organization. Users can only belong to one organization at a time.'
        });
      }
    }

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    // Get organization details for email
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();

    if (orgError) {
      return res.status(500).json({ error: 'Failed to fetch organization details' });
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .insert({
        email,
        first_name,
        last_name,
        organization_id: profile.organization_id,
        role: role || 'organization_member',
        invite_code: inviteCode,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
        message: message || null
      })
      .select()
      .single();

    if (inviteError) {
      return res.status(500).json({ error: 'Failed to create invite: ' + inviteError.message });
    }

    // Send invitation email
    try {
      const { sendInviteEmail } = require('../utils/emailService');
      
      const emailResult = await sendInviteEmail({
        email,
        first_name,
        last_name,
        job_title: role || 'Organization Member',
        department: 'General'
      }, inviteCode);

      if (!emailResult.success) {
        console.error('❌ Failed to send invitation email:', emailResult.error);
        // Don't fail the whole operation, just log the error
      } else {
        console.log('📧 Invitation email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Error sending invitation email:', emailError);
      // Don't fail the whole operation if email fails
    }

    // Generate invite link - use dynamic base URL
    const baseUrl = process.env.FRONTEND_URL || 
                   (process.env.NODE_ENV === 'production' ? 'https://chronoshr.onrender.com' : 'http://localhost:3000');
    const inviteLink = `${baseUrl}/invite/${inviteCode}`;

    res.status(201).json({
      message: 'Email invitation sent successfully',
      invite: {
        id: invite.id,
        email,
        first_name,
        last_name,
        role: role || 'organization_member',
        invite_code: inviteCode,
        invite_link: inviteLink,
        expires_at: invite.expires_at,
        organization_name: organization.name
      }
    });

  } catch (error) {
    console.error('Generate invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

// Get invite data by invite code
router.get('/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;

    // Find invite by code
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('is_used', false)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }

    // Check if invite is expired
    if (new Date() > new Date(invite.expires_at)) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    res.json({
      invite: {
        id: invite.id,
        email: invite.email,
        first_name: invite.first_name,
        last_name: invite.last_name,
        expires_at: invite.expires_at
      }
    });

  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ error: 'Failed to fetch invite' });
  }
});

// Accept invite and complete registration
router.post('/accept-invite', [
  body('invite_code').trim().isLength({ min: 1 }),
  body('password').isLength({ min: 6 }),
  body('phone').optional().trim(),
  body('employment_type').isIn(['full_time', 'part_time', 'contractor']),
  body('job_title').trim().isLength({ min: 1, max: 100 }),
  body('department').trim().isLength({ min: 1, max: 50 }),
  body('work_location').isIn(['remote', 'hybrid', 'onsite']),
  body('date_of_joining').isISO8601(),
  body('salary').optional().isNumeric(),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      invite_code, 
      password, 
      phone, 
      employment_type, 
      job_title, 
      department, 
      work_location, 
      date_of_joining, 
      salary, 
      currency 
    } = req.body;

    // Find and validate invite
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('invite_code', invite_code)
      .eq('is_used', false)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invalid or expired invite code' });
    }

    // Check if invite is expired
    if (new Date() > new Date(invite.expires_at)) {
      return res.status(400).json({ error: 'Invite has expired' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', invite.email)
      .single();

    let user;
    let profileError;

    if (existingUser) {
      // User exists, update their profile to join the organization
      user = { id: existingUser.id };
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: invite.organization_id,
          role: 'organization_member',
          phone: phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      profileError = updateError;
    } else {
      // User doesn't exist, create new user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      user = authData.user;

      // Create profile record
      const profileData = {
        id: user.id,
        email: invite.email,
        first_name: invite.first_name,
        last_name: invite.last_name,
        role: 'organization_member',
        organization_id: invite.organization_id,
        phone: phone || null
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert(profileData);

      profileError = insertError;
    }

    if (profileError) {
      // Clean up auth user if profile creation/update fails
      if (!existingUser) {
        await supabase.auth.admin.deleteUser(user.id);
      }
      return res.status(500).json({ error: 'Failed to create/update user profile: ' + profileError.message });
    }

    // Check if employee record already exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', invite.email)
      .eq('is_deleted', false)
      .single();

    let employeeError;

    if (existingEmployee) {
      // Update existing employee record
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          organization_id: invite.organization_id,
          profile_id: user.id,
          phone: phone || null,
          employment_type,
          job_title,
          department,
          work_location,
          employee_status: 'active',
          date_of_joining,
          salary: salary || null,
          currency: currency || 'USD',
          updated_by: invite.created_by,
          updated_at: new Date().toISOString(),
          is_active: true,
          is_deleted: false
        })
        .eq('id', existingEmployee.id);

      employeeError = updateError;
    } else {
      // Create new employee record
      const employeeData = {
        first_name: invite.first_name,
        last_name: invite.last_name,
        email: invite.email,
        phone: phone || null,
        employment_type,
        job_title,
        department,
        work_location,
        employee_status: 'active',
        date_of_joining,
        salary: salary || null,
        currency: currency || 'USD',
        organization_id: invite.organization_id,
        profile_id: user.id,
        created_by: invite.created_by,
        updated_by: invite.created_by,
        is_active: true,
        is_deleted: false
      };

      const { error: insertError } = await supabase
        .from('employees')
        .insert(employeeData);

      employeeError = insertError;
    }

    if (employeeError) {
      // Clean up if employee creation/update fails
      if (!existingUser) {
        await supabase.auth.admin.deleteUser(user.id);
        await supabase.from('users').delete().eq('id', user.id);
      }
      return res.status(500).json({ error: 'Failed to create/update employee record: ' + employeeError.message });
    }

    // Mark invite as used
    await supabase
      .from('invites')
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString(),
        used_by: user.id
      })
      .eq('id', invite.id);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: invite.email,
        first_name: invite.first_name,
        last_name: invite.last_name,
        role: 'organization_member',
        organization_id: invite.organization_id
      }
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// Leave organization
router.post('/leave-organization', authenticateToken, async (req, res) => {
  try {
    console.log('🚪 Leave organization request for user:', req.user.id);
    
    // Get current user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', req.user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (!profile.organization_id) {
      return res.status(400).json({ error: 'User is not part of any organization' });
    }

    // Check if user is the organization owner (super admin or admin)
    if (profile.role === 'super_admin' || profile.role === 'admin') {
      return res.status(403).json({ 
        error: 'Organization owners cannot leave their organization. Please transfer ownership or delete the organization instead.' 
      });
    }

    // Update user profile to remove organization_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        organization_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('❌ Error updating user profile:', updateError);
      return res.status(500).json({ error: 'Failed to leave organization' });
    }

    // Also update employee record if it exists
    const { error: employeeUpdateError } = await supabase
      .from('employees')
      .update({ 
        organization_id: null,
        employee_status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', req.user.id);

    if (employeeUpdateError) {
      console.log('⚠️ Warning: Could not update employee record:', employeeUpdateError);
      // Don't fail the request if employee update fails
    }

    console.log('✅ User successfully left organization');
    res.json({ 
      message: 'Successfully left the organization',
      user: {
        id: req.user.id,
        organization_id: null
      }
    });

  } catch (error) {
    console.error('❌ Leave organization error:', error);
    res.status(500).json({ error: 'Failed to leave organization' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Update payment settings
router.post('/update-payment-settings', authenticateToken, async (req, res) => {
    try {
        console.log('💰 Updating payment settings for user:', req.user.id);
        
        const { iban, bank_name, account_number, routing_number, stripe_enabled, stripe_api_key } = req.body;
        
        // Validate IBAN if provided
        if (iban && !validateIBAN(iban)) {
            return res.status(400).json({ error: 'Invalid IBAN format' });
        }
        
        // Update profile with payment information
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .update({
                iban: iban || null,
                bank_name: bank_name || null,
                account_number: account_number || null,
                routing_number: routing_number || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();
            
        if (profileError) {
            console.error('❌ Error updating profile:', profileError);
            return res.status(500).json({ error: 'Failed to update payment settings' });
        }
        
        // If Stripe is enabled, create or update Stripe customer
        if (stripe_enabled && stripe_api_key) {
            try {
                // In a real implementation, you would:
                // 1. Validate the Stripe API key
                // 2. Create or update Stripe customer
                // 3. Store Stripe customer ID in database
                
                console.log('💳 Stripe integration enabled for user:', req.user.id);
                
                // For now, just log the intent
                // In production, you would integrate with Stripe API here
                
            } catch (stripeError) {
                console.error('❌ Stripe integration error:', stripeError);
                return res.status(500).json({ error: 'Failed to configure Stripe integration' });
            }
        }
        
        console.log('✅ Payment settings updated successfully');
        res.json({ 
            success: true, 
            message: 'Payment settings updated successfully',
            profile: profile
        });
        
    } catch (error) {
        console.error('❌ Error updating payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// IBAN validation function
function validateIBAN(iban) {
    if (!iban) return true; // Empty is valid
    
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Basic IBAN validation regex
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
    
    return ibanRegex.test(cleanIban);
}

module.exports = router; 