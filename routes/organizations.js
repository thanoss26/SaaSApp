const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

// Get all organizations with search, filters, and pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 12, search = '', status = '', sortBy = 'name' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('organizations')
            .select(`
                *,
                member_count:profiles!organization_id(count),
                team_count:teams!organization_id(count)
            `, { count: 'exact' });

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,industry.ilike.%${search}%`);
        }

        // Apply status filter
        if (status) {
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
            totalPages: Math.ceil((count || 0) / limit)
        });

    } catch (error) {
        console.error('Error in organizations route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get organization statistics
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
        const { name, description, email, phone, address, website, industry } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        const { data: organization, error } = await supabase
            .from('organizations')
            .insert({
                name,
                description,
                email,
                phone,
                address,
                website,
                industry,
                created_by: user.id,
                is_active: true
            })
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
        const { name, description, email, phone, address, website, industry, is_active } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

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