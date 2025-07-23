const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const StripeDashboardService = require('../utils/stripeDashboardService');
const { supabase } = require('../config/supabase');

const stripeDashboardService = new StripeDashboardService();

/**
 * Check if user is admin
 */
const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (error || !profile) {
            return res.status(403).json({ error: 'Profile not found' });
        }

        if (profile.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('❌ Admin check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get Stripe dashboard metrics for an organization
 */
router.get('/metrics/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📊 GET /api/stripe-dashboard/metrics/:organizationId - Fetching dashboard metrics');
        const { organizationId } = req.params;
        const { dateRange = '30d' } = req.query;

        const metrics = await stripeDashboardService.getDashboardMetrics(organizationId, dateRange);
        
        console.log('✅ Dashboard metrics fetched successfully');
        res.json(metrics);
    } catch (error) {
        console.error('❌ Dashboard metrics error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch dashboard metrics' });
    }
});

/**
 * Get Stripe payment analytics for an organization
 */
router.get('/analytics/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📈 GET /api/stripe-dashboard/analytics/:organizationId - Fetching payment analytics');
        const { organizationId } = req.params;
        const { startDate, endDate, groupBy = 'day' } = req.query;

        const analytics = await stripeDashboardService.getPaymentAnalytics(organizationId, {
            startDate,
            endDate,
            groupBy
        });
        
        console.log('✅ Payment analytics fetched successfully');
        res.json(analytics);
    } catch (error) {
        console.error('❌ Payment analytics error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch payment analytics' });
    }
});

/**
 * Get Stripe customer data for an organization
 */
router.get('/customers/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('👥 GET /api/stripe-dashboard/customers/:organizationId - Fetching customer data');
        const { organizationId } = req.params;
        const { limit = 100, startingAfter } = req.query;

        const customers = await stripeDashboardService.getCustomers(organizationId, {
            limit: parseInt(limit),
            startingAfter
        });
        
        console.log('✅ Customer data fetched successfully');
        res.json(customers);
    } catch (error) {
        console.error('❌ Customer data error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch customer data' });
    }
});

/**
 * Get Stripe payment history for an organization
 */
router.get('/payments/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('💳 GET /api/stripe-dashboard/payments/:organizationId - Fetching payment history');
        const { organizationId } = req.params;
        const { limit = 50, startingAfter, status } = req.query;

        const payments = await stripeDashboardService.getPaymentHistory(organizationId, {
            limit: parseInt(limit),
            startingAfter,
            status
        });
        
        console.log('✅ Payment history fetched successfully');
        res.json(payments);
    } catch (error) {
        console.error('❌ Payment history error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch payment history' });
    }
});

/**
 * Get Stripe refund data for an organization
 */
router.get('/refunds/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔄 GET /api/stripe-dashboard/refunds/:organizationId - Fetching refund data');
        const { organizationId } = req.params;
        const { limit = 50, startingAfter } = req.query;

        const refunds = await stripeDashboardService.getRefunds(organizationId, {
            limit: parseInt(limit),
            startingAfter
        });
        
        console.log('✅ Refund data fetched successfully');
        res.json(refunds);
    } catch (error) {
        console.error('❌ Refund data error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch refund data' });
    }
});

/**
 * Get Stripe dashboard configuration for an organization
 */
router.get('/config/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('⚙️ GET /api/stripe-dashboard/config/:organizationId - Fetching dashboard config');
        const { organizationId } = req.params;

        const config = await stripeDashboardService.getDashboardConfig(organizationId);
        
        console.log('✅ Dashboard config fetched successfully');
        res.json(config);
    } catch (error) {
        console.error('❌ Dashboard config error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch dashboard config' });
    }
});

/**
 * Update Stripe dashboard configuration for an organization
 */
router.put('/config/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('⚙️ PUT /api/stripe-dashboard/config/:organizationId - Updating dashboard config');
        const { organizationId } = req.params;
        const configData = req.body;

        const updatedConfig = await stripeDashboardService.updateDashboardConfig(organizationId, configData);
        
        console.log('✅ Dashboard config updated successfully');
        res.json(updatedConfig);
    } catch (error) {
        console.error('❌ Dashboard config update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update dashboard config' });
    }
});

/**
 * Get Stripe webhook events for an organization
 */
router.get('/webhooks/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('🔔 GET /api/stripe-dashboard/webhooks/:organizationId - Fetching webhook events');
        const { organizationId } = req.params;
        const { limit = 50, startingAfter, type } = req.query;

        const webhooks = await stripeDashboardService.getWebhookEvents(organizationId, {
            limit: parseInt(limit),
            startingAfter,
            type
        });
        
        console.log('✅ Webhook events fetched successfully');
        res.json(webhooks);
    } catch (error) {
        console.error('❌ Webhook events error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch webhook events' });
    }
});

/**
 * Get Stripe dashboard summary for an organization
 */
router.get('/summary/:organizationId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📋 GET /api/stripe-dashboard/summary/:organizationId - Fetching dashboard summary');
        const { organizationId } = req.params;

        const summary = await stripeDashboardService.getDashboardSummary(organizationId);
        
        console.log('✅ Dashboard summary fetched successfully');
        res.json(summary);
    } catch (error) {
        console.error('❌ Dashboard summary error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch dashboard summary' });
    }
});

module.exports = router; 