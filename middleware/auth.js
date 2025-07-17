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
      .from('profiles')
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

// Middleware to check if user belongs to organization
const requireOrganizationAccess = (req, res, next) => {
  if (!req.profile || !req.profile.organization_id) {
    return res.status(403).json({ error: 'Organization access required' });
  }
  next();
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
  requireOrganizationMembership
}; 