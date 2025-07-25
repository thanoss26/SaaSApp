const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables for plan limits middleware');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Middleware to check if user can add more employees
const checkEmployeeLimit = async (req, res, next) => {
    try {
        const { data: canAdd, error } = await supabaseAdmin
            .rpc('can_add_employee', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error checking employee limit:', error);
            return res.status(500).json({ 
                error: 'Failed to check employee limit',
                details: 'Please try again later'
            });
        }
        
        if (!canAdd) {
            return res.status(403).json({
                error: 'Employee limit reached',
                details: 'You have reached the maximum number of employees for your plan. Please upgrade to add more employees.',
                upgradeRequired: true,
                currentPlan: 'free',
                suggestedPlan: 'starter'
            });
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in employee limit middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to check if user has analytics access
const checkAnalyticsAccess = async (req, res, next) => {
    try {
        const { data: limits, error } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error checking analytics access:', error);
            return res.status(500).json({ 
                error: 'Failed to check plan limits',
                details: 'Please try again later'
            });
        }
        
        const planLimits = limits[0] || { has_analytics: false };
        
        if (!planLimits.has_analytics) {
            return res.status(403).json({
                error: 'Analytics not available',
                details: 'Analytics features are not available on your current plan. Please upgrade to access analytics.',
                upgradeRequired: true,
                currentPlan: planLimits.plan_name || 'free',
                suggestedPlan: 'starter'
            });
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in analytics access middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to check if user has advanced features access
const checkAdvancedFeaturesAccess = async (req, res, next) => {
    try {
        const { data: limits, error } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error checking advanced features access:', error);
            return res.status(500).json({ 
                error: 'Failed to check plan limits',
                details: 'Please try again later'
            });
        }
        
        const planLimits = limits[0] || { has_advanced_features: false };
        
        if (!planLimits.has_advanced_features) {
            return res.status(403).json({
                error: 'Advanced features not available',
                details: 'Advanced features are not available on your current plan. Please upgrade to access advanced features.',
                upgradeRequired: true,
                currentPlan: planLimits.plan_name || 'free',
                suggestedPlan: 'professional'
            });
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in advanced features middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to check if user has API access
const checkApiAccess = async (req, res, next) => {
    try {
        const { data: limits, error } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error checking API access:', error);
            return res.status(500).json({ 
                error: 'Failed to check plan limits',
                details: 'Please try again later'
            });
        }
        
        const planLimits = limits[0] || { has_api_access: false };
        
        if (!planLimits.has_api_access) {
            return res.status(403).json({
                error: 'API access not available',
                details: 'API access is not available on your current plan. Please upgrade to access the API.',
                upgradeRequired: true,
                currentPlan: planLimits.plan_name || 'free',
                suggestedPlan: 'professional'
            });
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in API access middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to check if user has priority support
const checkPrioritySupport = async (req, res, next) => {
    try {
        const { data: limits, error } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error checking priority support:', error);
            return res.status(500).json({ 
                error: 'Failed to check plan limits',
                details: 'Please try again later'
            });
        }
        
        const planLimits = limits[0] || { has_priority_support: false };
        
        if (!planLimits.has_priority_support) {
            return res.status(403).json({
                error: 'Priority support not available',
                details: 'Priority support is not available on your current plan. Please upgrade to access priority support.',
                upgradeRequired: true,
                currentPlan: planLimits.plan_name || 'free',
                suggestedPlan: 'professional'
            });
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in priority support middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Middleware to get user's plan limits and attach to request
const attachPlanLimits = async (req, res, next) => {
    try {
        const { data: limits, error } = await supabaseAdmin
            .rpc('get_user_plan_limits', { user_uuid: req.user.id });
        
        if (error) {
            console.error('❌ Error getting plan limits:', error);
            // Don't fail the request, just set default limits
            req.planLimits = {
                plan_name: 'free',
                max_employees: 3,
                max_organizations: 1,
                has_analytics: false,
                has_advanced_features: false,
                has_api_access: false,
                has_priority_support: false
            };
        } else {
            req.planLimits = limits[0] || {
                plan_name: 'free',
                max_employees: 3,
                max_organizations: 1,
                has_analytics: false,
                has_advanced_features: false,
                has_api_access: false,
                has_priority_support: false
            };
        }
        
        next();
    } catch (error) {
        console.error('❌ Error in plan limits middleware:', error);
        // Don't fail the request, just set default limits
        req.planLimits = {
            plan_name: 'free',
            max_employees: 3,
            max_organizations: 1,
            has_analytics: false,
            has_advanced_features: false,
            has_api_access: false,
            has_priority_support: false
        };
        next();
    }
};

module.exports = {
    checkEmployeeLimit,
    checkAnalyticsAccess,
    checkAdvancedFeaturesAccess,
    checkApiAccess,
    checkPrioritySupport,
    attachPlanLimits
}; 