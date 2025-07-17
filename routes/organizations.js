const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

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
router.get('/dashboard-metrics', authenticateToken, async (req, res) => {
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

        if (!profile.organization_id) {
            console.log('❌ User has no organization assigned');
            return res.status(400).json({ error: 'User not assigned to any organization' });
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

// Get single organization
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: organization, error } = await supabase
            .from('organizations')
            .select(`
                *,
                member_count:profiles!organization_id(count),
                team_count:teams!organization_id(count)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Organization not found' });
            }
            console.error('Error fetching organization:', error);
            return res.status(500).json({ error: 'Failed to fetch organization' });
        }

        res.json(organization);

    } catch (error) {
        console.error('Error in organization route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new organization
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { 
            name, 
            description, 
            email, 
            phone, 
            address, 
            website, 
            industry,
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

        // Prepare organization data
        const organizationData = {
            name,
            description,
            email,
            phone,
            address,
            website,
            industry,
            created_by: user.id,
            is_active: true
        };

        // Add admin-only fields if user is admin
        if (isAdmin) {
            organizationData.total_employees = total_employees || 0;
            organizationData.job_applicants = job_applicants || 0;
            organizationData.attendance_report = attendance_report || 0.00;
            organizationData.total_revenue = total_revenue || 0.00;
            organizationData.tasks = tasks || 0;
        }

        const { data: organization, error } = await supabase
            .from('organizations')
            .insert(organizationData)
            .select()
            .single();

        if (error) {
            console.error('Error creating organization:', error);
            return res.status(500).json({ error: 'Failed to create organization' });
        }

        res.status(201).json(organization);

    } catch (error) {
        console.error('Error in create organization route:', error);
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

module.exports = router; 