const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { 
  authenticateToken, 
  requireGlobalStatsAccess,
  requireOrganizationOverviewAccess,
  requirePayrollAccess,
  requireAnalyticsAccess,
  requireInviteUsersAccess,
  requireNotificationsAccess
} = require('../middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get all dashboards for the user's organization
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data: user } = req.user;
        
        // Get user's organization
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Get dashboards for the organization
        const { data: dashboards, error } = await supabase
            .from('dashboards')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching dashboards:', error);
            return res.status(500).json({ error: 'Failed to fetch dashboards' });
        }
        
        res.json({ dashboards });
        
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get a specific dashboard with its widgets
router.get('/:slug', authenticateToken, async (req, res) => {
    try {
        const { slug } = req.params;
        const { data: user } = req.user;
        
        // Get user's organization
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Get dashboard
        const { data: dashboard, error: dashboardError } = await supabase
            .from('dashboards')
            .select('*')
            .eq('slug', slug)
            .eq('organization_id', profile.organization_id)
            .single();
            
        if (dashboardError || !dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        // Get widgets for the dashboard
        const { data: widgets, error: widgetsError } = await supabase
            .from('dashboard_widgets')
            .select('*')
            .eq('dashboard_id', dashboard.id)
            .order('order_index', { ascending: true });
            
        if (widgetsError) {
            console.error('Error fetching widgets:', widgetsError);
            return res.status(500).json({ error: 'Failed to fetch widgets' });
        }
        
        res.json({ 
            dashboard,
            widgets: widgets || []
        });
        
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new dashboard
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, slug, description, is_default = false } = req.body;
        const { data: user } = req.user;
        
        if (!name || !slug) {
            return res.status(400).json({ error: 'Name and slug are required' });
        }
        
        // Get user's organization
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Check if user has permission to create dashboards
        if (!['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // If this is a default dashboard, unset other defaults first
        if (is_default) {
            await supabase
                .from('dashboards')
                .update({ is_default: false })
                .eq('organization_id', profile.organization_id)
                .eq('is_default', true);
        }
        
        // Create the dashboard
        const { data: dashboard, error } = await supabase
            .from('dashboards')
            .insert({
                name,
                slug,
                description,
                organization_id: profile.organization_id,
                is_default
            })
            .select()
            .single();
            
        if (error) {
            console.error('Error creating dashboard:', error);
            return res.status(500).json({ error: 'Failed to create dashboard' });
        }
        
        res.status(201).json({ dashboard });
        
    } catch (error) {
        console.error('Dashboard creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a dashboard
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, is_default } = req.body;
        const { data: user } = req.user;
        
        // Get user's organization and role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Check if user has permission to update dashboards
        if (!['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // If this is a default dashboard, unset other defaults first
        if (is_default) {
            await supabase
                .from('dashboards')
                .update({ is_default: false })
                .eq('organization_id', profile.organization_id)
                .eq('is_default', true)
                .neq('id', id);
        }
        
        // Update the dashboard
        const { data: dashboard, error } = await supabase
            .from('dashboards')
            .update({
                name,
                slug,
                description,
                is_default
            })
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single();
            
        if (error || !dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        res.json({ dashboard });
        
    } catch (error) {
        console.error('Dashboard update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a dashboard
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: user } = req.user;
        
        // Get user's organization and role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Check if user has permission to delete dashboards
        if (!['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // Delete the dashboard (widgets will be deleted automatically due to CASCADE)
        const { error } = await supabase
            .from('dashboards')
            .delete()
            .eq('id', id)
            .eq('organization_id', profile.organization_id);
            
        if (error) {
            console.error('Error deleting dashboard:', error);
            return res.status(500).json({ error: 'Failed to delete dashboard' });
        }
        
        res.json({ message: 'Dashboard deleted successfully' });
        
    } catch (error) {
        console.error('Dashboard deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Widget routes

// Get widgets for a dashboard
router.get('/:dashboardId/widgets', authenticateToken, async (req, res) => {
    try {
        const { dashboardId } = req.params;
        const { data: user } = req.user;
        
        // Get user's organization
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Verify dashboard belongs to user's organization
        const { data: dashboard, error: dashboardError } = await supabase
            .from('dashboards')
            .select('id')
            .eq('id', dashboardId)
            .eq('organization_id', profile.organization_id)
            .single();
            
        if (dashboardError || !dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        // Get widgets
        const { data: widgets, error } = await supabase
            .from('dashboard_widgets')
            .select('*')
            .eq('dashboard_id', dashboardId)
            .order('order_index', { ascending: true });
            
        if (error) {
            console.error('Error fetching widgets:', error);
            return res.status(500).json({ error: 'Failed to fetch widgets' });
        }
        
        res.json({ widgets: widgets || [] });
        
    } catch (error) {
        console.error('Widgets fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new widget
router.post('/:dashboardId/widgets', authenticateToken, async (req, res) => {
    try {
        const { dashboardId } = req.params;
        const { type, title, config, order_index } = req.body;
        const { data: user } = req.user;
        
        if (!type || !title) {
            return res.status(400).json({ error: 'Type and title are required' });
        }
        
        // Get user's organization and role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Check if user has permission to create widgets
        if (!['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // Verify dashboard belongs to user's organization
        const { data: dashboard, error: dashboardError } = await supabase
            .from('dashboards')
            .select('id')
            .eq('id', dashboardId)
            .eq('organization_id', profile.organization_id)
            .single();
            
        if (dashboardError || !dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        
        // Create the widget
        const { data: widget, error } = await supabase
            .from('dashboard_widgets')
            .insert({
                dashboard_id: dashboardId,
                type,
                title,
                config: config || {},
                order_index: order_index || 0
            })
            .select()
            .single();
            
        if (error) {
            console.error('Error creating widget:', error);
            return res.status(500).json({ error: 'Failed to create widget' });
        }
        
        res.status(201).json({ widget });
        
    } catch (error) {
        console.error('Widget creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a widget
router.put('/widgets/:widgetId', authenticateToken, async (req, res) => {
    try {
        const { widgetId } = req.params;
        const { type, title, config, order_index } = req.body;
        const { data: user } = req.user;
        
        // Get user's organization and role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Check if user has permission to update widgets
        if (!['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // Update the widget
        const { data: widget, error } = await supabase
            .from('dashboard_widgets')
            .update({
                type,
                title,
                config,
                order_index
            })
            .eq('id', widgetId)
            .select()
            .single();
            
        if (error || !widget) {
            return res.status(404).json({ error: 'Widget not found' });
        }
        
        res.json({ widget });
        
    } catch (error) {
        console.error('Widget update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a widget
router.delete('/widgets/:widgetId', authenticateToken, async (req, res) => {
    try {
        const { widgetId } = req.params;
        const { data: user } = req.user;
        
        // Get user's organization and role
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
            
        if (profileError || !profile.organization_id) {
            return res.status(400).json({ error: 'User has no organization assigned' });
        }
        
        // Check if user has permission to delete widgets
        if (!['admin', 'super_admin'].includes(profile.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        // Delete the widget
        const { error } = await supabase
            .from('dashboard_widgets')
            .delete()
            .eq('id', widgetId);
            
        if (error) {
            console.error('Error deleting widget:', error);
            return res.status(500).json({ error: 'Failed to delete widget' });
        }
        
        res.json({ message: 'Widget deleted successfully' });
        
    } catch (error) {
        console.error('Widget deletion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 