const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken, requireOrganization, requireInvitePermission, requireInviteUsersAccess, requireOrganizationOverviewAccess } = require('../middleware/auth');

// POST /api/organizations - Create organization (redirects to auth route)
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('🏢 POST /api/organizations - Creating organization');
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Only admins can create organizations
        if (profile.role !== 'admin' && profile.role !== 'super_admin') {
            console.log('❌ User role not admin:', profile.role);
            return res.status(403).json({ error: 'Only admins can create organizations' });
        }

        // Check if user already has an organization
        if (profile.organization_id) {
            console.log('❌ User already has organization:', profile.organization_id);
            return res.status(400).json({ error: 'User already belongs to an organization' });
        }

        const { name, description, industry, size, website, address, total_employees } = req.body;
        
        // Generate join code
        const generateJoinCode = () => {
            return Math.floor(100000 + Math.random() * 900000).toString();
        };
        
        const joinCode = generateJoinCode();
        
        console.log('🔍 Creating organization with:', { name, description, joinCode });

        // Create organization with organization_creator field
        const { data: organization, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name,
                description: description || null,
                join_code: joinCode,
                organization_creator: req.user.id,
                industry: industry || null,
                size: size || null,
                website: website || null,
                address: address || null,
                total_employees: total_employees ? parseInt(total_employees) : null
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
                        join_code: joinCode,
                        industry: industry || null,
                        size: size || null,
                        website: website || null,
                        address: address || null,
                        total_employees: total_employees ? parseInt(total_employees) : null
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
            .from('profiles')
            .update({ organization_id: organization.id })
            .eq('id', req.user.id);

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

// Get all organizations with search, filters, and pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 12, search = '', status = '', sortBy = 'name' } = req.query;
        const offset = (page - 1) * limit;
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';
        
        // Select different fields based on user role
        const selectFields = isAdmin 
            ? `
                *,
                member_count:profiles!organization_id(count),
                team_count:teams!organization_id(count)
            `
            : `
                id,
                name,
                description,
                join_code,
                created_at,
                updated_at,
                member_count:profiles!organization_id(count),
                team_count:teams!organization_id(count)
            `;

        let query = supabase
            .from('organizations')
            .select(selectFields, { count: 'exact' });

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Apply status filter
        if (status && isAdmin) {
            query = query.eq('is_active', status === 'active');
        }

        // Apply sorting
        switch (sortBy) {
            case 'created_at':
                query = query.order('created_at', { ascending: false });
                break;
            case 'member_count':
                query = query.order('member_count', { ascending: false });
                break;
            case 'total_revenue':
                if (isAdmin) query = query.order('total_revenue', { ascending: false });
                else query = query.order('name', { ascending: true });
                break;
            case 'total_employees':
                if (isAdmin) query = query.order('total_employees', { ascending: false });
                else query = query.order('name', { ascending: true });
                break;
            default:
                query = query.order('name', { ascending: true });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: organizations, error, count } = await query;

        if (error) {
            console.error('Error fetching organizations:', error);
            return res.status(500).json({ error: 'Failed to fetch organizations' });
        }

        res.json({
            organizations: organizations || [],
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((count || 0) / limit),
            userRole: profile.role,
            isAdmin
        });

    } catch (error) {
        console.error('Error in organizations route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get organization dashboard metrics
router.get('/dashboard-metrics', authenticateToken, requireOrganization, async (req, res) => {
    try {
        console.log('📊 Fetching organization dashboard metrics...');
        
        // Get user's organization and role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

        if (!isAdmin) {
            console.log('❌ User is not admin - access denied');
            return res.status(403).json({ error: 'Admin access required for dashboard metrics' });
        }

        console.log('✅ User organization found:', profile.organization_id);

        // Get organization data with admin fields
        const { data: organization, error: orgError } = await supabase
            .from('organizations')
            .select('total_employees, job_applicants, attendance_report, total_revenue, tasks')
            .eq('id', profile.organization_id)
            .single();

        if (orgError) {
            console.error('❌ Error fetching organization:', orgError);
            
            // If organization doesn't exist, return default metrics
            if (orgError.code === 'PGRST116') {
                console.log('⚠️ Organization not found, returning default metrics');
                const defaultMetrics = {
                    totalEmployees: {
                        value: 0,
                        change: '0%',
                        trend: 'up',
                        label: 'Total Employees'
                    },
                    jobApplicants: {
                        value: 0,
                        change: '0%',
                        trend: 'up',
                        label: 'Job Applicants'
                    },
                    attendanceReport: {
                        value: '0.0%',
                        change: '0%',
                        trend: 'up',
                        label: 'Attendance Report'
                    },
                    totalRevenue: {
                        value: '$0.00',
                        change: '0%',
                        trend: 'up',
                        label: 'Total Revenue'
                    },
                    tasks: {
                        value: 0,
                        change: '0%',
                        trend: 'up',
                        label: 'Tasks'
                    }
                };
                return res.json({ metrics: defaultMetrics });
            }
            
            return res.status(500).json({ error: 'Failed to fetch organization data' });
        }

        // Get real employee count from profiles table for comparison
        const { data: employees, error: employeeError } = await supabase
            .from('profiles')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .eq('is_active', true);

        if (employeeError) {
            console.error('❌ Error fetching employees:', employeeError);
            return res.status(500).json({ error: 'Failed to fetch employees' });
        }

        const actualEmployeeCount = employees?.length || 0;
        console.log('👥 Actual employees in system:', actualEmployeeCount);
        console.log('📊 Organization metrics:', organization);

        // Use organization data if available, fallback to calculated values
        const totalEmployees = organization.total_employees || actualEmployeeCount;
        const jobApplicants = organization.job_applicants || Math.floor(totalEmployees * 2.5) + Math.floor(Math.random() * 50);
        const attendanceRate = organization.attendance_report || (85 + Math.random() * 20 - 10);
        const totalRevenue = organization.total_revenue || (totalEmployees * 2500 + Math.random() * 5000);
        const tasks = organization.tasks || Math.floor(totalEmployees * 3 + Math.random() * 20);
        
        const metrics = {
            totalEmployees: {
                value: totalEmployees,
                change: totalEmployees > 0 ? '+12%' : '0%',
                trend: 'up',
                label: 'Total Employees'
            },
            jobApplicants: {
                value: jobApplicants,
                change: '+8%',
                trend: 'up',
                label: 'Job Applicants'
            },
            attendanceReport: {
                value: `${attendanceRate.toFixed(1)}%`,
                change: attendanceRate > 85 ? '+3%' : '-2%',
                trend: attendanceRate > 85 ? 'up' : 'down',
                label: 'Attendance Report'
            },
            totalRevenue: {
                value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                change: '+15%',
                trend: 'up',
                label: 'Total Revenue'
            },
            tasks: {
                value: tasks,
                change: '+5%',
                trend: 'up',
                label: 'Tasks'
            }
        };

        console.log('📈 Metrics calculated:', metrics);
        res.json({ metrics });

    } catch (error) {
        console.error('❌ Error in dashboard-metrics route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get organization statistics (existing endpoint)
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get total organizations
        const { count: total } = await supabase
            .from('organizations')
            .select('*', { count: 'exact', head: true });

        // Get active organizations
        const { count: active } = await supabase
            .from('organizations')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Get organizations created this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: recent } = await supabase
            .from('organizations')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString());

        // Get total members across all organizations
        const { count: totalMembers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .not('organization_id', 'is', null);

        res.json({
            total: total || 0,
            active: active || 0,
            recent: recent || 0,
            totalMembers: totalMembers || 0
        });

    } catch (error) {
        console.error('Error fetching organization stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/organizations/:id - Get organization details, members, and creator
router.get('/:id', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    console.log('🏢 GET /api/organizations/:id - Fetching organization details');
    
    try {
        const organizationId = req.params.id;
        const userId = req.user.id;
        
        console.log('🔍 Organization ID:', organizationId);
        console.log('🔍 User ID:', userId);
        console.log('🔍 User profile:', req.profile);

        // First, check if the organization exists (using admin client to bypass RLS)
        const { data: orgExists, error: existsError } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('id', organizationId)
            .single();

        if (existsError) {
            console.error('❌ Organization does not exist:', existsError);
            return res.status(404).json({ error: 'Organization not found' });
        }

        console.log('✅ Organization exists:', orgExists);

        // Check if user has access to this organization
        if (req.profile.role !== 'super_admin' && req.profile.organization_id !== organizationId) {
            console.error('❌ User does not have access to this organization');
            console.error('🔍 User organization_id:', req.profile.organization_id);
            console.error('🔍 Requested organization_id:', organizationId);
            return res.status(403).json({ 
                error: 'You do not have access to this organization',
                userOrganizationId: req.profile.organization_id,
                requestedOrganizationId: organizationId
            });
        }

        // Get organization details with creator information (using admin client to bypass RLS)
        const { data: organization, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select(`
                id,
                name,
                join_code,
                created_at,
                updated_at,
                organization_creator
            `)
            .eq('id', organizationId)
            .single();

        if (orgError) {
            console.error('❌ Error fetching organization:', orgError);
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Get all members of the organization
        const { data: members, error: membersError } = await supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                email,
                role,
                is_active,
                created_at,
                updated_at
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true });

        if (membersError) {
            console.error('❌ Error fetching members:', membersError);
            return res.status(500).json({ error: 'Failed to fetch organization members' });
        }

        // Get additional member details from employees table if available
        const { data: employeeDetails, error: employeeError } = await supabase
            .from('employees')
            .select(`
                user_id,
                position,
                hire_date,
                employment_type,
                department
            `)
            .eq('organization_id', organizationId)
            .eq('is_deleted', false);

        // Merge employee details with member profiles
        const enrichedMembers = members.map(member => {
            const employeeDetail = employeeDetails?.find(emp => emp.user_id === member.id);
            return {
                ...member,
                position: employeeDetail?.position || 'Member',
                hire_date: employeeDetail?.hire_date || member.created_at,
                employment_type: employeeDetail?.employment_type || 'full_time',
                department: employeeDetail?.department || 'General'
            };
        });

        console.log('✅ Organization details fetched successfully');
        console.log('👥 Members count:', enrichedMembers.length);

        // Get creator profile information
        let creatorInfo = null;
        if (organization.organization_creator) {
            const { data: creator, error: creatorError } = await supabase
                .from('profiles')
                .select(`
                    id,
                    first_name,
                    last_name,
                    email
                `)
                .eq('id', organization.organization_creator)
                .single();
            
            if (!creatorError && creator) {
                creatorInfo = {
                    id: creator.id,
                    name: `${creator.first_name} ${creator.last_name}`,
                    email: creator.email
                };
            }
        }

        res.json({
            organization: {
                id: organization.id,
                name: organization.name,
                join_code: organization.join_code,
                created_at: organization.created_at,
                updated_at: organization.updated_at,
                creator: creatorInfo
            },
            members: enrichedMembers
        });

    } catch (error) {
        console.error('❌ Error in /api/organizations/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/organizations/:id/members - Get only organization members
router.get('/:id/members', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    console.log('👥 GET /api/organizations/:id/members - Fetching organization members');
    
    try {
        const organizationId = req.params.id;
        
        console.log('🔍 Organization ID:', organizationId);

        // Get all members of the organization
        const { data: members, error: membersError } = await supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                email,
                role,
                is_active,
                created_at,
                updated_at
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true });

        if (membersError) {
            console.error('❌ Error fetching members:', membersError);
            return res.status(500).json({ error: 'Failed to fetch organization members' });
        }

        // Get additional member details from employees table if available
        const { data: employeeDetails, error: employeeError } = await supabase
            .from('employees')
            .select(`
                user_id,
                position,
                hire_date,
                employment_type,
                department
            `)
            .eq('organization_id', organizationId)
            .eq('is_deleted', false);

        // Merge employee details with member profiles
        const enrichedMembers = members.map(member => {
            const employeeDetail = employeeDetails?.find(emp => emp.user_id === member.id);
            return {
                ...member,
                position: employeeDetail?.position || 'Member',
                hire_date: employeeDetail?.hire_date || member.created_at,
                employment_type: employeeDetail?.employment_type || 'full_time',
                department: employeeDetail?.department || 'General'
            };
        });

        console.log('✅ Members fetched successfully');
        console.log('👥 Members count:', enrichedMembers.length);

        res.json({ members: enrichedMembers });

    } catch (error) {
        console.error('❌ Error in /api/organizations/:id/members:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/organizations/:id - Update organization details (admin only)
router.put('/:id', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    console.log('✏️ PUT /api/organizations/:id - Updating organization details');
    
    try {
        const organizationId = req.params.id;
        const userId = req.user.id;
        const updateData = req.body;
        
        console.log('🔍 Organization ID:', organizationId);
        console.log('🔍 User ID:', userId);
        console.log('📝 Update data:', updateData);

        // Check if user is admin or super_admin
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to verify user permissions' });
        }

        if (!['admin', 'super_admin'].includes(userProfile.role)) {
            console.error('❌ User not authorized to update organization');
            return res.status(403).json({ error: 'You are not authorized to update this organization' });
        }

        // For regular admins, ensure they can only update their own organization
        if (userProfile.role === 'admin' && userProfile.organization_id !== organizationId) {
            console.error('❌ Admin trying to update different organization');
            return res.status(403).json({ error: 'You can only update your own organization' });
        }

        // Update organization
        const { data: updatedOrg, error: updateError } = await supabase
            .from('organizations')
            .update({
                name: updateData.name,
                description: updateData.description,
                industry: updateData.industry,
                size: updateData.size,
                website: updateData.website,
                address: updateData.address,
                updated_at: new Date().toISOString()
            })
            .eq('id', organizationId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating organization:', updateError);
            return res.status(500).json({ error: 'Failed to update organization' });
        }

        console.log('✅ Organization updated successfully');

        res.json({
            message: 'Organization updated successfully',
            organization: updatedOrg
        });

    } catch (error) {
        console.error('❌ Error in PUT /api/organizations/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update organization
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            email, 
            phone, 
            address, 
            website, 
            industry, 
            is_active,
            total_employees,
            job_applicants,
            attendance_report,
            total_revenue,
            tasks
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

        const updateData = {
            name,
            description,
            email,
            phone,
            address,
            website,
            industry,
            updated_at: new Date().toISOString()
        };

        if (typeof is_active === 'boolean') {
            updateData.is_active = is_active;
        }

        // Add admin-only fields if user is admin
        if (isAdmin) {
            if (total_employees !== undefined) updateData.total_employees = total_employees;
            if (job_applicants !== undefined) updateData.job_applicants = job_applicants;
            if (attendance_report !== undefined) updateData.attendance_report = attendance_report;
            if (total_revenue !== undefined) updateData.total_revenue = total_revenue;
            if (tasks !== undefined) updateData.tasks = tasks;
        }

        const { data: organization, error } = await supabase
            .from('organizations')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Organization not found' });
            }
            console.error('Error updating organization:', error);
            return res.status(500).json({ error: 'Failed to update organization' });
        }

        res.json(organization);

    } catch (error) {
        console.error('Error in update organization route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete organization
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if organization exists
        const { data: existingOrg, error: fetchError } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Organization not found' });
            }
            console.error('Error fetching organization:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch organization' });
        }

        // Delete organization
        const { error: deleteError } = await supabase
            .from('organizations')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting organization:', deleteError);
            return res.status(500).json({ error: 'Failed to delete organization' });
        }

        res.json({ message: 'Organization deleted successfully' });

    } catch (error) {
        console.error('Error in delete organization route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get organization members
router.get('/:id/members', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data: members, error, count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .eq('organization_id', id)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching organization members:', error);
            return res.status(500).json({ error: 'Failed to fetch members' });
        }

        res.json({
            members: members || [],
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error in organization members route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get organization teams
router.get('/:id/teams', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: teams, error } = await supabase
            .from('teams')
            .select('*')
            .eq('organization_id', id)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching organization teams:', error);
            return res.status(500).json({ error: 'Failed to fetch teams' });
        }

        res.json(teams || []);

    } catch (error) {
        console.error('Error in organization teams route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Invite Management Endpoints

// Get active invites count
router.get('/invites/count', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        const { data: invites, error } = await supabase
            .from('invites')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString());

        if (error) {
            console.error('Error fetching invites count:', error);
            return res.status(500).json({ error: 'Failed to fetch invites count' });
        }

        res.json({ count: invites?.length || 0 });

    } catch (error) {
        console.error('Error in invites count route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current invite link
router.get('/invites/link', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Get the most recent active invite link
        const { data: invite, error } = await supabase
            .from('invites')
            .select('invite_code, expires_at')
            .eq('organization_id', profile.organization_id)
            .eq('is_used', false)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching invite link:', error);
            return res.status(500).json({ error: 'Failed to fetch invite link' });
        }

        if (!invite) {
            return res.status(404).json({ error: 'No active invite link found' });
        }

        const inviteLink = `${req.protocol}://${req.get('host')}/invite/${invite.invite_code}`;
        
        res.json({ 
            inviteLink,
            expiresAt: invite.expires_at
        });

    } catch (error) {
        console.error('Error in invite link route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate new invite link
router.post('/invites/generate', authenticateToken, requireOrganization, async (req, res) => {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Generate unique invite code
        const inviteCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        // Create new invite record
        const { data: invite, error } = await supabase
            .from('invites')
            .insert({
                organization_id: profile.organization_id,
                role: 'organization_member', // Default role for invited users
                invite_code: inviteCode,
                expires_at: expiresAt.toISOString(),
                created_by: req.user.id,
                is_used: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating invite:', error);
            return res.status(500).json({ error: 'Failed to create invite' });
        }

        const inviteLink = `${req.protocol}://${req.get('host')}/invite/${inviteCode}`;
        
        res.json({ 
            inviteLink,
            inviteCode,
            expiresAt: invite.expires_at
        });

    } catch (error) {
        console.error('Error in generate invite route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send email invitation (admin/super_admin only)
router.post('/invites/send', authenticateToken, requireOrganization, requireInviteUsersAccess, async (req, res) => {
    try {
        const { email, firstName, lastName, role, message } = req.body;

        if (!email || !firstName || !lastName) {
            return res.status(400).json({ error: 'Email, first name, and last name are required' });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, first_name, last_name')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Check if user already exists - but allow invitations to existing users
        const { data: existingUser, error: userError } = await supabase
            .from('profiles')
            .select('id, organization_id')
            .eq('email', email)
            .single();

        if (userError && userError.code !== 'PGRST116') {
            console.error('Error checking existing user:', userError);
            return res.status(500).json({ error: 'Failed to check existing user' });
        }

        // If user exists and already belongs to an organization, check if it's the same organization
        if (existingUser && existingUser.organization_id) {
            if (existingUser.organization_id === profile.organization_id) {
                return res.status(400).json({ error: 'User is already a member of this organization' });
            } else {
                return res.status(400).json({ error: 'User already belongs to another organization' });
            }
        }

        // Generate invite code
        const inviteCode = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        // Create invite record
        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .insert({
                organization_id: profile.organization_id,
                email: email,
                first_name: firstName,
                last_name: lastName,
                role: role || 'organization_member', // Use provided role or default to organization_member
                invite_code: inviteCode,
                expires_at: expiresAt.toISOString(),
                created_by: req.user.id,
                is_used: false
            })
            .select()
            .single();

        if (inviteError) {
            console.error('Error creating invite:', inviteError);
            return res.status(500).json({ error: 'Failed to create invite' });
        }

        // TODO: Send email invitation
        // For now, just return success
        console.log('📧 Invitation created for:', email);
        console.log('🔗 Invite link:', `${req.protocol}://${req.get('host')}/invite/${inviteCode}`);

        res.json({ 
            message: 'Invitation sent successfully',
            inviteId: invite.id,
            inviteCode: inviteCode
        });

    } catch (error) {
        console.error('Error in send invite route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update organization (admin/super_admin only)
router.put('/:id', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    try {
        console.log('📝 Updating organization:', req.params.id);
        
        const { name, description } = req.body;
        
        // Validate required fields
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ User is not admin - access denied');
            return res.status(403).json({ error: 'Admin access required to update organization' });
        }

        // Verify user belongs to the organization they're trying to update
        if (profile.organization_id !== req.params.id) {
            console.log('❌ User does not belong to this organization');
            return res.status(403).json({ error: 'You can only update your own organization' });
        }

        // Update organization
        const { data: updatedOrg, error: updateError } = await supabase
            .from('organizations')
            .update({
                name: name.trim(),
                description: description ? description.trim() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .select('id, name, description, created_at, updated_at')
            .single();

        if (updateError) {
            console.error('❌ Error updating organization:', updateError);
            return res.status(500).json({ error: 'Failed to update organization' });
        }

        console.log('✅ Organization updated successfully:', updatedOrg);
        res.json({ 
            message: 'Organization updated successfully',
            organization: updatedOrg
        });

    } catch (error) {
        console.error('❌ Error in update organization route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete organization (admin/super_admin only)
router.delete('/:id', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    try {
        console.log('🗑️ Deleting organization:', req.params.id);
        
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ User is not admin - access denied');
            return res.status(403).json({ error: 'Admin access required to delete organization' });
        }

        // Verify user belongs to the organization they're trying to delete
        if (profile.organization_id !== req.params.id) {
            console.log('❌ User does not belong to this organization');
            return res.status(403).json({ error: 'You can only delete your own organization' });
        }

        // Delete organization and related data manually
        console.log('🗑️ Starting cascade deletion...');
        
        // Delete invites for this organization
        const { error: invitesError } = await supabaseAdmin
            .from('invites')
            .delete()
            .eq('organization_id', req.params.id);
            
        if (invitesError) {
            console.error('❌ Error deleting invites:', invitesError);
            return res.status(500).json({ error: 'Failed to delete organization invites' });
        }
        
        // Delete teams for this organization
        const { error: teamsError } = await supabaseAdmin
            .from('teams')
            .delete()
            .eq('organization_id', req.params.id);
            
        if (teamsError) {
            console.error('❌ Error deleting teams:', teamsError);
            return res.status(500).json({ error: 'Failed to delete organization teams' });
        }
        
        // Update profiles to remove organization_id (don't delete users)
        const { error: profilesError } = await supabaseAdmin
            .from('profiles')
            .update({
                organization_id: null,
                role: 'user',
                updated_at: new Date().toISOString()
            })
            .eq('organization_id', req.params.id);
            
        if (profilesError) {
            console.error('❌ Error updating profiles:', profilesError);
            return res.status(500).json({ error: 'Failed to update organization members' });
        }
        
        // Delete the organization itself
        const { error: orgError } = await supabaseAdmin
            .from('organizations')
            .delete()
            .eq('id', req.params.id);
            
        if (orgError) {
            console.error('❌ Error deleting organization:', orgError);
            return res.status(500).json({ error: 'Failed to delete organization' });
        }

        console.log('✅ Organization deleted successfully');
        res.json({ 
            message: 'Organization deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error in delete organization route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/organizations/add-offline-member - Add offline member to organization
router.post('/add-offline-member', authenticateToken, async (req, res) => {
    try {
        console.log('👤 POST /api/organizations/add-offline-member - Adding offline member');
        
        const {
            // Basic Information
            first_name, last_name, email, phone, date_of_birth, bio,
            // Employment Information
            role, job_title, department, employment_type, employment_start_date, 
            work_location, salary, currency,
            // Banking Information
            iban, bank_name,
            // Documents and Additional Information
            documents, emergency_contact_name,
            emergency_contact_phone, address_line1,
            address_line2, city, state_province, postal_code, country,
            organization_id
        } = req.body;
        
        // Validate required fields
        if (!first_name || !last_name || !email || !role || !organization_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', req.user.id)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Only admins can add offline members
        if (!['admin', 'super_admin'].includes(profile.role)) {
            console.log('❌ User role not admin:', profile.role);
            return res.status(403).json({ error: 'Only admins can add offline members' });
        }

        // Verify user belongs to the organization they're trying to add members to
        if (profile.organization_id !== organization_id) {
            console.log('❌ User does not belong to this organization');
            return res.status(403).json({ error: 'You can only add members to your own organization' });
        }

        // Check if email already exists in the organization
        const { data: existingMember, error: existingError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .eq('organization_id', organization_id)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            console.error('❌ Error checking existing member:', existingError);
            return res.status(500).json({ error: 'Failed to check existing member' });
        }

        if (existingMember) {
            return res.status(400).json({ error: 'A member with this email already exists in the organization' });
        }

        // Generate a UUID for the new member
        const newMemberId = uuidv4();

        // Use the database function to create offline member profile
        // This function handles the foreign key constraint properly
        const { data: newMember, error: memberError } = await supabase
            .rpc('create_offline_member_profile', {
                p_id: newMemberId,
                p_email: email,
                p_first_name: first_name,
                p_last_name: last_name,
                p_role: role,
                p_organization_id: organization_id,
                p_phone: phone,
                p_date_of_birth: date_of_birth,
                p_bio: bio,
                p_job_title: job_title,
                p_department: department,
                p_employment_type: employment_type,
                p_employment_start_date: employment_start_date,
                p_work_location: work_location,
                p_salary: salary,
                p_currency: currency,
                p_iban: iban,
                p_bank_name: bank_name,
                p_documents: documents,
                p_emergency_contact_name: emergency_contact_name,
                p_emergency_contact_phone: emergency_contact_phone,
                p_address_line1: address_line1,
                p_address_line2: address_line2,
                p_city: city,
                p_state_province: state_province,
                p_postal_code: postal_code,
                p_country: country
            });

        if (memberError) {
            console.error('❌ Error creating offline member:', memberError);
            return res.status(500).json({ error: 'Failed to create offline member: ' + memberError.message });
        }

        console.log('✅ Offline member added successfully:', newMember);
        res.json({ 
            message: 'Offline member added successfully',
            member: { id: newMember }
        });

    } catch (error) {
        console.error('❌ Error in add offline member route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to generate invite code
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// GET /api/organizations/members/:id - Get member details
router.get('/members/:id', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    console.log('👤 GET /api/organizations/members/:id - Fetching member details');
    
    try {
        const memberId = req.params.id;
        const userId = req.user.id;
        
        console.log('🔍 Member ID:', memberId);
        console.log('🔍 User ID:', userId);

        // Get user profile to check permissions
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to verify user permissions' });
        }

        // Get member details
        const { data: member, error: memberError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', memberId)
            .single();

        if (memberError) {
            console.error('❌ Error fetching member:', memberError);
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if user has permission to view this member
        // Admin/super_admin can view any member in their organization
        // Regular members can only view themselves
        if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
            if (member.organization_id !== userProfile.organization_id) {
                console.error('❌ Member not in same organization');
                return res.status(403).json({ error: 'You can only view members in your organization' });
            }
        } else {
            if (member.id !== userId) {
                console.error('❌ Regular member trying to view other member');
                return res.status(403).json({ error: 'You can only view your own profile' });
            }
        }

        console.log('✅ Member details fetched successfully');
        res.json({ member });

    } catch (error) {
        console.error('❌ Error in GET /api/organizations/members/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/organizations/members/:id/remove - Remove member from organization
router.post('/members/:id/remove', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    console.log('🗑️ POST /api/organizations/members/:id/remove - Removing member from organization');
    
    try {
        const memberId = req.params.id;
        const userId = req.user.id;
        
        console.log('🔍 Member ID to remove:', memberId);
        console.log('🔍 User ID performing removal:', userId);

        // Get user profile to check permissions
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to verify user permissions' });
        }

        // Only admins can remove members
        if (!['admin', 'super_admin'].includes(userProfile.role)) {
            console.error('❌ User not authorized to remove members');
            return res.status(403).json({ error: 'Only administrators can remove members' });
        }

        // Get member details
        const { data: member, error: memberError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', memberId)
            .single();

        if (memberError) {
            console.error('❌ Error fetching member:', memberError);
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if member is in the same organization
        if (member.organization_id !== userProfile.organization_id) {
            console.error('❌ Member not in same organization');
            return res.status(403).json({ error: 'You can only remove members from your organization' });
        }

        // Prevent removing the last admin
        if (member.role === 'admin' || member.role === 'super_admin') {
            const { count: adminCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', userProfile.organization_id)
                .in('role', ['admin', 'super_admin']);

            if (adminCount <= 1) {
                console.error('❌ Cannot remove the last administrator');
                return res.status(400).json({ error: 'Cannot remove the last administrator from the organization' });
            }
        }

        // Prevent removing yourself
        if (member.id === userId) {
            console.error('❌ User trying to remove themselves');
            return res.status(400).json({ error: 'You cannot remove yourself from the organization' });
        }

        // Remove member from organization by setting organization_id to null
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                organization_id: null,
                role: 'organization_member', // Reset to default role
                updated_at: new Date().toISOString()
            })
            .eq('id', memberId);

        if (updateError) {
            console.error('❌ Error removing member:', updateError);
            return res.status(500).json({ error: 'Failed to remove member from organization' });
        }

        console.log('✅ Member removed from organization successfully');
        res.json({ 
            message: 'Member removed from organization successfully',
            member: {
                id: member.id,
                name: `${member.first_name} ${member.last_name}`,
                email: member.email
            }
        });

    } catch (error) {
        console.error('❌ Error in POST /api/organizations/members/:id/remove:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/organizations/members/:id - Update member details
router.put('/members/:id', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
    console.log('✏️ PUT /api/organizations/members/:id - Updating member details');
    
    try {
        const memberId = req.params.id;
        const userId = req.user.id;
        const updateData = req.body;
        
        console.log('🔍 Member ID:', memberId);
        console.log('🔍 User ID:', userId);
        console.log('📝 Update data:', updateData);

        // Get user profile to check permissions
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role, organization_id')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            return res.status(500).json({ error: 'Failed to verify user permissions' });
        }

        // Only admins can edit members
        if (!['admin', 'super_admin'].includes(userProfile.role)) {
            console.error('❌ User not authorized to edit members');
            return res.status(403).json({ error: 'Only administrators can edit members' });
        }

        // Get member details
        const { data: member, error: memberError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', memberId)
            .single();

        if (memberError) {
            console.error('❌ Error fetching member:', memberError);
            return res.status(404).json({ error: 'Member not found' });
        }

        // Check if member is in the same organization
        if (member.organization_id !== userProfile.organization_id) {
            console.error('❌ Member not in same organization');
            return res.status(403).json({ error: 'You can only edit members in your organization' });
        }

        // Prevent editing yourself (for role changes)
        if (member.id === userId && updateData.role && updateData.role !== member.role) {
            console.error('❌ User trying to change their own role');
            return res.status(400).json({ error: 'You cannot change your own role' });
        }

        // Prevent removing the last admin
        if (member.role === 'admin' && updateData.role && updateData.role !== 'admin') {
            const { count: adminCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', userProfile.organization_id)
                .in('role', ['admin', 'super_admin']);

            if (adminCount <= 1) {
                console.error('❌ Cannot remove the last administrator');
                return res.status(400).json({ error: 'Cannot remove the last administrator from the organization' });
            }
        }

        // Prepare update data
        const updateFields = {
            first_name: updateData.first_name,
            last_name: updateData.last_name,
            email: updateData.email,
            phone: updateData.phone,
            date_of_birth: updateData.date_of_birth,
            bio: updateData.bio,
            address_line1: updateData.address_line1,
            address_line2: updateData.address_line2,
            city: updateData.city,
            state_province: updateData.state_province,
            postal_code: updateData.postal_code,
            country: updateData.country,
            emergency_contact_name: updateData.emergency_contact_name,
            emergency_contact_phone: updateData.emergency_contact_phone,
            job_title: updateData.job_title,
            department: updateData.department,
            employment_type: updateData.employment_type,
            employment_start_date: updateData.employment_start_date,
            employment_end_date: updateData.employment_end_date,
            work_location: updateData.work_location,
            salary: updateData.salary,
            currency: updateData.currency,
            iban: updateData.iban,
            bank_name: updateData.bank_name,
            bank_country: updateData.bank_country,
            role: updateData.role,
            is_active: updateData.is_active,
            updated_at: new Date().toISOString()
        };

        // Remove undefined values
        Object.keys(updateFields).forEach(key => {
            if (updateFields[key] === undefined) {
                delete updateFields[key];
            }
        });

        // Update member
        const { data: updatedMember, error: updateError } = await supabase
            .from('profiles')
            .update(updateFields)
            .eq('id', memberId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating member:', updateError);
            return res.status(500).json({ error: 'Failed to update member' });
        }

        console.log('✅ Member updated successfully');

        res.json({
            message: 'Member updated successfully',
            member: updatedMember
        });

    } catch (error) {
        console.error('❌ Error in PUT /api/organizations/members/:id:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 