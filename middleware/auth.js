const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  console.log('🔐 Auth middleware hit for:', req.path);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('🔍 Token exists:', !!token);

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log('🔍 Verifying token with Supabase...');
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('🔍 Token verification result - User:', !!user);
    console.log('🔍 Token verification result - Error:', error);
    
    if (error || !user) {
      console.log('❌ Token verification failed');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('🔍 Fetching user profile for middleware...');
    // Get user profile with role and organization info
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('🔍 Profile fetch in middleware - Data:', !!profile);
    console.log('🔍 Profile fetch in middleware - Error:', profileError);

    if (profileError) {
      console.log('❌ Profile fetch failed in middleware');
      return res.status(401).json({ error: 'User profile not found' });
    }

    console.log('✅ Auth middleware successful, proceeding to endpoint');
    // Attach user and profile to request object
    req.user = user;
    req.profile = profile;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.profile || (req.profile.role !== 'admin' && req.profile.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is manager or admin
const requireManagerOrAdmin = (req, res, next) => {
  if (!req.profile || !['admin', 'manager', 'super_admin'].includes(req.profile.role)) {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }
  next();
};

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.profile || req.profile.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// New middleware for role-based access control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(403).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.profile.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: req.profile.role
      });
    }
    
    next();
  };
};

// Middleware to restrict organization_member actions
const restrictOrganizationMember = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // organization_member users have restricted access
  if (req.profile.role === 'organization_member') {
    return res.status(403).json({ 
      error: 'This action is restricted for organization members',
      userRole: req.profile.role,
      message: 'Only administrators and managers can perform this action'
    });
  }
  
  next();
};

// Middleware for Global Stats (Super Admin only)
const requireGlobalStatsAccess = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  if (req.profile.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Global stats access denied',
      userRole: req.profile.role,
      message: 'Only super administrators can access global statistics'
    });
  }
  
  next();
};

// Middleware for Organization Overview (Admin and Member with restrictions)
const requireOrganizationOverviewAccess = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // Super admin can access everything
  if (req.profile.role === 'super_admin') {
    return next();
  }
  
  // Admin can access full organization overview
  if (req.profile.role === 'admin') {
    return next();
  }
  
  // Employee can access limited analytics
  if (req.profile.role === 'employee') {
    // Add flag to request for limited access
    req.limitedAccess = true;
    return next();
  }
  
  // Organization member can only access limited (self) overview
  if (req.profile.role === 'organization_member') {
    // Add flag to request for limited access
    req.limitedAccess = true;
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Organization overview access denied',
    userRole: req.profile.role
  });
};

// Middleware for Payroll Access (Admin: all, Member: self only)
const requirePayrollAccess = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // Super admin can access everything
  if (req.profile.role === 'super_admin') {
    return next();
  }
  
  // Admin can access all payroll
  if (req.profile.role === 'admin') {
    return next();
  }
  
  // Organization member can only access their own payroll
  if (req.profile.role === 'organization_member') {
    req.selfOnlyAccess = true;
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Payroll access denied',
    userRole: req.profile.role
  });
};

// Middleware for Analytics Access (Admin only, Member: no access)
const requireAnalyticsAccess = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // Super admin can access everything
  if (req.profile.role === 'super_admin') {
    return next();
  }
  
  // Admin can access organization-wide analytics
  if (req.profile.role === 'admin') {
    return next();
  }
  
  // Employee can access limited analytics
  if (req.profile.role === 'employee') {
    // Add flag to request for limited access
    req.limitedAccess = true;
    return next();
  }
  
  // Organization member has no access to analytics
  if (req.profile.role === 'organization_member') {
    return res.status(403).json({ 
      error: 'Analytics access denied',
      userRole: req.profile.role,
      message: 'Organization members cannot access analytics'
    });
  }
  
  return res.status(403).json({ 
    error: 'Analytics access denied',
    userRole: req.profile.role
  });
};

// Middleware for Invite Users (Admin only)
const requireInviteUsersAccess = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // Super admin can invite users
  if (req.profile.role === 'super_admin') {
    return next();
  }
  
  // Admin can invite users
  if (req.profile.role === 'admin') {
    return next();
  }
  
  // Organization member cannot invite users
  if (req.profile.role === 'organization_member') {
    return res.status(403).json({ 
      error: 'Invite users access denied',
      userRole: req.profile.role,
      message: 'Organization members cannot invite users'
    });
  }
  
  return res.status(403).json({ 
    error: 'Invite users access denied',
    userRole: req.profile.role
  });
};

// Middleware for Notifications/Inbox (All roles)
const requireNotificationsAccess = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  // All roles can access notifications/inbox
  if (['super_admin', 'admin', 'organization_member'].includes(req.profile.role)) {
    return next();
  }
  
  return res.status(403).json({ 
    error: 'Notifications access denied',
    userRole: req.profile.role
  });
};

// Middleware to check if user can manage users (admin, manager, super_admin only)
const requireUserManagement = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  const allowedRoles = ['admin', 'manager', 'super_admin'];
  if (!allowedRoles.includes(req.profile.role)) {
    return res.status(403).json({ 
      error: 'User management access required',
      userRole: req.profile.role,
      message: 'Only administrators and managers can manage users'
    });
  }
  
  next();
};

// Middleware to check if user can send invitations (admin, super_admin only)
const requireInvitePermission = (req, res, next) => {
  if (!req.profile) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  const allowedRoles = ['admin', 'super_admin'];
  if (!allowedRoles.includes(req.profile.role)) {
    return res.status(403).json({ 
      error: 'Invitation permission required',
      userRole: req.profile.role,
      message: 'Only administrators can send invitations'
    });
  }
  
  next();
};

// Middleware to check if user belongs to organization
const requireOrganizationAccess = (req, res, next) => {
  if (!req.profile || !req.profile.organization_id) {
    return res.status(403).json({ error: 'Organization access required' });
  }
  next();
};

// New middleware to check organization requirements for dashboard access
const requireOrganization = async (req, res, next) => {
  try {
    // Super admin can access everything without organization
    if (req.profile.role === 'super_admin') {
      return next();
    }

    // For admin and below roles, require organization
    if (!req.profile.organization_id) {
      return res.status(403).json({ 
        error: 'Organization required',
        requiresOrganization: true,
        userRole: req.profile.role,
        message: 'You need to create or join an organization to access this feature'
      });
    }

    next();
  } catch (error) {
    console.error('❌ Organization requirement check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check organization status for frontend
const checkOrganizationStatus = async (req, res, next) => {
  try {
    // Add organization status to request
    req.organizationStatus = {
      hasOrganization: !!req.profile.organization_id,
      requiresOrganization: req.profile.role !== 'super_admin',
      userRole: req.profile.role
    };

    next();
  } catch (error) {
    console.error('❌ Organization status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user can access specific organization
const requireOrganizationMembership = (organizationId) => {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    // Admins can access any organization
    if (req.profile.role === 'admin') {
      return next();
    }

    // Regular users can only access their own organization
    if (req.profile.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManagerOrAdmin,
  requireSuperAdmin,
  requireOrganizationAccess,
  requireOrganizationMembership,
  requireOrganization,
  checkOrganizationStatus,
  requireRole,
  restrictOrganizationMember,
  requireUserManagement,
  requireInvitePermission,
  requireGlobalStatsAccess,
  requireOrganizationOverviewAccess,
  requirePayrollAccess,
  requireAnalyticsAccess,
  requireInviteUsersAccess,
  requireNotificationsAccess
}; 