const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboards');
const employeeRoutes = require('./routes/employees');
const organizationRoutes = require('./routes/organizations');
const payrollRoutes = require('./routes/payroll');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payment');
const mailboxRoutes = require('./routes/mailbox');
const stripeRoutes = require('./routes/stripe');
const stripeDashboardRoutes = require('./routes/stripeDashboard');
const subscriptionRoutes = require('./routes/subscriptions');
const analyticsRoutes = require('./routes/analytics');
const { 
  authenticateToken,
  requireGlobalStatsAccess,
  requireOrganizationOverviewAccess,
  requirePayrollAccess,
  requireAnalyticsAccess,
  requireInviteUsersAccess
} = require('./middleware/auth');

const { checkAnalyticsAccess } = require('./middleware/planLimits');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render deployment (fixes rate limiting)
app.set('trust proxy', 1);

// Dynamic configuration based on environment
const config = {
  isProduction: process.env.NODE_ENV === 'production',
  baseUrl: process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://chronoshr.onrender.com' : 'http://localhost:3000'),
  port: PORT,
  environment: process.env.NODE_ENV || 'development'
};

console.log('🔧 Environment Configuration:');
console.log(`   Environment: ${config.environment}`);
console.log(`   Base URL: ${config.baseUrl}`);
console.log(`   Port: ${config.port}`);
console.log(`   Production: ${config.isProduction}`);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', "'sha256-9wF3mPmFam0b5SxsZhkDUfTOUicPsMdY547xLFPUNMo='"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      imgSrc: ["'self'", 'data:', 'https://randomuser.me', 'https://api.dicebear.com', 'https://ui-avatars.com'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting - more generous to prevent "Too many requests" errors
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (for proxy environments like Render)
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  }
});
app.use(limiter);

// CORS configuration - support both localhost and Render
const allowedOrigins = [
  'http://localhost:3000',
  'https://chronoshr.onrender.com',
  'https://www.chronoshr.onrender.com'
];

// Add custom origin from environment if provided
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cache control middleware
app.use((req, res, next) => {
  // Cache static assets for 1 hour
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  // Cache API responses for 30 seconds (for GET requests)
  else if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, max-age=30');
  }
  next();
});

// Cache busting middleware
app.use((req, res, next) => {
  // Force no-cache for all HTML requests
  if (req.path.endsWith('.html') || req.path === '/' || req.path === '/dashboard' || req.path === '/users' || req.path === '/settings' || req.path === '/payroll' || req.path === '/analytics') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
  }
  next();
});

// Request logging middleware (for debugging rate limiting)
app.use((req, res, next) => {
  const start = Date.now();

  // Log API requests
  if (req.path.startsWith('/api/')) {
    console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
  }

  // Log response time
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      console.log(`✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
});

// Serve static files with explicit configuration (excluding index.html)
app.use(express.static('public', {
  etag: false,
  lastModified: false,
  index: false, // Disable automatic index.html serving
  setHeaders: (res, path) => {
    // Different cache strategies for different file types
    if (path.endsWith('.css') || path.endsWith('.js')) {
      // CSS and JS files - cache for 1 hour but with version
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    } else if (path.endsWith('.html')) {
      // HTML files - no cache
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    } else {
      // Other static files - cache for 1 day
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    // Add version header for debugging
    res.setHeader('X-App-Version', '2.0.0');
    res.setHeader('X-Design-Version', 'new-spa-design');
  }
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV,
    supabase: {
      url: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      anonKey: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    }
  });
});

// Rate limit status endpoint
app.get('/api/rate-limit-status', (req, res) => {
  res.json({
    message: 'Rate limiting is active',
    limits: {
      general: '1000 requests per 15 minutes',
      api: '2000 requests per 15 minutes'
    },
    headers: {
      'X-RateLimit-Limit': res.getHeader('X-RateLimit-Limit'),
      'X-RateLimit-Remaining': res.getHeader('X-RateLimit-Remaining'),
      'X-RateLimit-Reset': res.getHeader('X-RateLimit-Reset')
    }
  });
});

// API-specific rate limiting - more generous for authenticated users
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // limit each IP to 2000 requests per windowMs for API routes
  message: {
    error: 'API rate limit exceeded. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (for proxy environments like Render)
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  }
});

// API routes with specific rate limiting
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/organizations', apiLimiter, organizationRoutes);
app.use('/api/users', apiLimiter, authenticateToken, userRoutes);
app.use('/api/employees', apiLimiter, authenticateToken, employeeRoutes);
app.use('/api/dashboards', apiLimiter, authenticateToken, dashboardRoutes);
app.use('/api/mailbox', apiLimiter, mailboxRoutes);
app.use('/api/payroll', apiLimiter, authenticateToken, payrollRoutes);
app.use('/api/payment', apiLimiter, authenticateToken, paymentRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/stripe-dashboard', stripeDashboardRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics', apiLimiter, authenticateToken, analyticsRoutes);

// Clean URL routes (no .html extensions) with cache busting
// Note: Authentication will be handled by the frontend JavaScript

// Landing page route
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(__dirname + '/public/landing.html');
});

// Dashboard route - main app with sidebar
app.get('/dashboard', (req, res) => {
  console.log('🔍 Dashboard route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/dashboard.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ dashboard.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ dashboard.html file not found');
    res.status(404).send('Dashboard page not found');
  }
});

// Login route
app.get('/login', (req, res) => {
  console.log('🔍 Login route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/login.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ login.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ login.html file not found');
    res.status(404).send('Login page not found');
  }
});

// Signup route
app.get('/signup', (req, res) => {
  console.log('🔍 Signup route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/signup.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ signup.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ signup.html file not found');
    res.status(404).send('Signup page not found');
  }
});

// Users route
app.get('/users', (req, res) => {
  console.log('👥 Users route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/users.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ users.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ users.html file not found');
    res.status(404).send('Users page not found');
  }
});

// Organizations route
app.get('/organizations', (req, res) => {
  console.log('🏢 Organizations route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/organizations.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ organizations.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ organizations.html file not found');
    res.status(404).send('Organizations page not found');
  }
});

// Subscription Settings route
app.get('/subscription-settings', (req, res) => {
  console.log('⚙️ Subscription Settings route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/subscription-settings.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ subscription-settings.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ subscription-settings.html file not found');
    res.status(404).send('Subscription Settings page not found');
  }
});

// Payroll route
app.get('/payroll', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(__dirname + '/public/payroll.html');
});

// Analytics route - client-side authentication
app.get('/analytics', (req, res) => {
  console.log('🔍 Analytics route hit');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(__dirname + '/public/analytics.html');
});

// Settings route
app.get('/settings', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(__dirname + '/public/settings.html');
});

// Profile route
app.get('/profile', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(__dirname + '/public/profile.html');
});

// Create organization route
app.get('/create-organization', (req, res) => {
  console.log('🔍 Create organization route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/create-organization.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ create-organization.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ create-organization.html file not found');
    res.status(404).send('Create organization page not found');
  }
});

// Invite route
app.get('/invite/:inviteCode', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}"`);
  res.sendFile(__dirname + '/public/invite.html');
});

// Test routes (for debugging)
app.get('/test-dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
  res.sendFile(__dirname + '/public/test-dashboard.html');
});

app.get('/test-simple', (req, res) => {
  const fs = require('fs');
  const filePath = __dirname + '/public/test-simple.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ test-simple.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ test-simple.html file not found');
    res.status(404).send('Test page not found');
  }
});

app.get('/dashboard-debug', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
  res.sendFile(__dirname + '/public/dashboard-debug.html');
});

// Simple login page (minimal JavaScript for debugging)
app.get('/login-simple', (req, res) => {
  console.log('🔐 Simple login route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/login-simple.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ login-simple.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ login-simple.html file not found');
    res.status(404).send('Simple login page not found');
  }
});

// Redirects from .html URLs to clean URLs (for backward compatibility)
app.get('/dashboard.html', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/users.html', (req, res) => {
  res.redirect('/users');
});

app.get('/organizations.html', (req, res) => {
  res.redirect('/organizations');
});

app.get('/payroll.html', (req, res) => {
  res.redirect('/payroll');
});

app.get('/analytics.html', (req, res) => {
  res.redirect('/analytics');
});

app.get('/settings.html', (req, res) => {
  res.redirect('/settings');
});

app.get('/profile.html', (req, res) => {
  res.redirect('/profile');
});

app.get('/test-dashboard.html', (req, res) => {
  res.redirect('/test-dashboard');
});

app.get('/dashboard-debug.html', (req, res) => {
  res.redirect('/dashboard-debug');
});

app.get('/login.html', (req, res) => {
  res.redirect('/login');
});

app.get('/signup.html', (req, res) => {
  res.redirect('/signup');
});

app.get('/create-organization.html', (req, res) => {
  res.redirect('/create-organization');
});

// Dashboard API endpoints
app.get('/api/dashboard/stats', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
  try {
    const { profile } = req;
    const { supabase } = require('./config/supabase');

    // Handle super_admin users who don't have an organization_id
    if (profile.role === 'super_admin') {
      // Get platform-wide statistics for super admin
      const [
        { count: totalUsers },
        { count: totalOrganizations },
        { count: totalEmployees },
        { count: activeEmployees },
        { count: totalInvites },
        { count: pendingInvites }
      ] = await Promise.all([
        // Total users across all organizations
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false),
        
        // Total organizations
        supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false),
        
        // Total employees across all organizations
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('is_deleted', false),
        
        // Active employees
        supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('is_deleted', false),
        
        // Total invites sent
        supabase
          .from('invites')
          .select('*', { count: 'exact', head: true }),
        
        // Pending invites
        supabase
          .from('invites')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
      ]);
      

      // Get recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentSignups } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_deleted', false);

      // Get recent organization creations (last 7 days)
      const { count: recentOrganizations } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_deleted', false);

      // Calculate platform uptime (mock calculation - in real app, this would be from monitoring)
      const platformUptime = 99.9; // This would come from your monitoring system

      // Calculate growth rates for dashboard stats
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

      // Get growth data
      const [
        { count: usersThisMonth },
        { count: usersLastMonth },
        { count: usersThisWeek },
        { count: usersLastWeek }
      ] = await Promise.all([
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString())
          .eq('is_deleted', false),
        
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', twoMonthsAgo.toISOString())
          .lt('created_at', oneMonthAgo.toISOString())
          .eq('is_deleted', false),
        
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneWeekAgo.toISOString())
          .eq('is_deleted', false),
        
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .lt('created_at', oneWeekAgo.toISOString())
          .eq('is_deleted', false)
      ]);

      // Calculate growth percentages
      const userGrowthThisMonth = usersLastMonth > 0 ? 
        Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) : 
        (usersThisMonth > 0 ? 100 : 0);
      
      const userGrowthThisWeek = usersLastWeek > 0 ? 
        Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100) : 
        (usersThisWeek > 0 ? 100 : 0);

      res.json({
        // Platform-wide metrics for super admin
        totalUsers: totalUsers || 0,
        activeUsers: totalUsers || 0, // For now, assume all users are active
        totalOrganizations: totalOrganizations || 0,
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        totalInvites: totalInvites || 0,
        pendingInvites: pendingInvites || 0,
        recentSignups: recentSignups || 0,
        recentOrganizations: recentOrganizations || 0,
        platformUptime: platformUptime,
        
        // Growth metrics
        userGrowthThisMonth: userGrowthThisMonth,
        userGrowthThisWeek: userGrowthThisWeek,
        orgGrowthThisMonth: 0, // Will be calculated in analytics API
        employeeGrowthThisMonth: 0, // Will be calculated in analytics API
        
        // Legacy fields for compatibility
        departments: totalOrganizations || 0,
        attendanceRate: platformUptime,
        fullTimeCount: Math.floor((totalEmployees || 0) * 0.7), // Estimate 70% full-time
        partTimeCount: Math.floor((totalEmployees || 0) * 0.2), // Estimate 20% part-time
        contractorCount: Math.floor((totalEmployees || 0) * 0.1), // Estimate 10% contractors
        recentHires: recentSignups || 0
      });
    } else if (profile.role === 'admin') {
      // Admin-specific statistics relevant to their profile and management
      if (!profile.organization_id) {
        return res.json({
          totalEmployees: 0,
          activeEmployees: 0,
          departments: 0,
          attendanceRate: 0,
          fullTimeCount: 0,
          partTimeCount: 0,
          contractorCount: 0,
          recentHires: 0,
          message: 'No organization assigned'
        });
      }

      // Get total employees under admin's management
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_deleted', false);

      // Get active employees
      const { count: activeEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .eq('is_deleted', false);

      // Get employees by employment type
      const { count: fullTimeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('employment_type', 'full_time')
        .eq('is_deleted', false);

      const { count: partTimeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('employment_type', 'part_time')
        .eq('is_deleted', false);

      const { count: contractorCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('employment_type', 'contractor')
        .eq('is_deleted', false);

      // Get recent hires (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentHires } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_deleted', false);

      // Get pending approvals (employees awaiting admin approval)
      const { count: pendingApprovals } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('status', 'pending_approval')
        .eq('is_deleted', false);

      // Get team performance metrics (employees with performance ratings)
      const { data: performanceData } = await supabase
        .from('employees')
        .select('performance_rating')
        .eq('organization_id', profile.organization_id)
        .not('performance_rating', 'is', null)
        .eq('is_deleted', false);

      const averagePerformance = performanceData && performanceData.length > 0 
        ? Math.round(performanceData.reduce((sum, emp) => sum + (emp.performance_rating || 0), 0) / performanceData.length)
        : 0;

      // Get admin's management efficiency (employees per department)
      const { data: departmentData } = await supabase
        .from('employees')
        .select('department')
        .eq('organization_id', profile.organization_id)
        .eq('is_deleted', false);

      const uniqueDepartments = departmentData 
        ? [...new Set(departmentData.map(emp => emp.department).filter(Boolean))]
        : [];
      const departmentCount = uniqueDepartments.length;

      const attendanceRate = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;

      res.json({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        departments: departmentCount,
        attendanceRate: attendanceRate,
        fullTimeCount: fullTimeCount || 0,
        partTimeCount: partTimeCount || 0,
        contractorCount: contractorCount || 0,
        recentHires: recentHires || 0,
        pendingApprovals: pendingApprovals || 0,
        averagePerformance: averagePerformance,
        managementEfficiency: departmentCount > 0 ? Math.round(totalEmployees / departmentCount) : 0
      });
    } else {
      // Regular users - filter by their organization
      if (!profile.organization_id) {
        // Return empty data for users without organization (they can still access mailbox)
        return res.json({
          totalEmployees: 0,
          activeEmployees: 0,
          departments: 0,
          attendanceRate: 0,
          fullTimeCount: 0,
          partTimeCount: 0,
          contractorCount: 0,
          recentHires: 0,
          message: 'No organization assigned'
        });
      }

      // Check if this is limited access (organization_member)
      const isLimitedAccess = req.limitedAccess;

      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_deleted', false);

      const { count: activeEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .eq('is_deleted', false);

      const { count: fullTimeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('employment_type', 'full_time')
        .eq('is_deleted', false);

      const { count: partTimeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('employment_type', 'part_time')
        .eq('is_deleted', false);

      const { count: contractorCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('employment_type', 'contractor')
        .eq('is_deleted', false);

      // Get recent hires (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentHires } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_deleted', false);

      const attendanceRate = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;

      // For organization members, provide limited data
      if (isLimitedAccess) {
        res.json({
          totalEmployees: totalEmployees || 0,
          activeEmployees: activeEmployees || 0,
          departments: 0,
          attendanceRate: attendanceRate,
          fullTimeCount: 0, // Limited access - don't show detailed breakdown
          partTimeCount: 0, // Limited access - don't show detailed breakdown
          contractorCount: 0, // Limited access - don't show detailed breakdown
          recentHires: 0, // Limited access - don't show recent hires
          message: 'Limited organization overview'
        });
      } else {
        // Full access for admins
        res.json({
          totalEmployees: totalEmployees || 0,
          activeEmployees: activeEmployees || 0,
          departments: 0,
          attendanceRate: attendanceRate,
          fullTimeCount: fullTimeCount || 0,
          partTimeCount: partTimeCount || 0,
          contractorCount: contractorCount || 0,
          recentHires: recentHires || 0
        });
      }
    }

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/charts', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
  try {
    const { profile } = req;
    const { supabase } = require('./config/supabase');

    // Get employee growth data for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    let growthQuery = supabase
      .from('employees')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    // Filter by organization for non-super_admin users
    if (profile.role !== 'super_admin' && profile.organization_id) {
      growthQuery = growthQuery.eq('organization_id', profile.organization_id);
    }
    // For super_admin users, don't filter by organization (they can see all data)

    const { data: growthData, error: growthError } = await growthQuery;

    if (growthError) {
      console.error('Growth data error:', growthError);
    }

    // Process growth data into monthly counts
    const monthlyCounts = new Array(12).fill(0);
    const currentDate = new Date();

    if (growthData) {
      growthData.forEach(employee => {
        const createdDate = new Date(employee.created_at);
        const monthDiff = currentDate.getMonth() - createdDate.getMonth() +
          (currentDate.getFullYear() - createdDate.getFullYear()) * 12;
        if (monthDiff >= 0 && monthDiff < 12) {
          monthlyCounts[monthDiff]++;
        }
      });
    }

    // Get employment type distribution
    let employmentQuery = supabase
      .from('employees')
      .select('employment_type')
      .eq('is_active', true)
      .eq('is_deleted', false);

    // Filter by organization for non-super_admin users
    if (profile.role !== 'super_admin' && profile.organization_id) {
      employmentQuery = employmentQuery.eq('organization_id', profile.organization_id);
    }
    // For super_admin users, don't filter by organization (they can see all data)

    const { data: employmentData, error: employmentError } = await employmentQuery;

    if (employmentError) {
      console.error('Employment type data error:', employmentError);
    }

    // Count employment types
    const employmentCounts = {
      full_time: 0,
      part_time: 0,
      contractor: 0
    };

    if (employmentData) {
      employmentData.forEach(employee => {
        if (employmentCounts.hasOwnProperty(employee.employment_type)) {
          employmentCounts[employee.employment_type]++;
        }
      });
    }

    // For organization members, provide limited chart data
    if (req.limitedAccess) {
      res.json({
        growth: monthlyCounts,
        employmentTypes: [0, 0, 0], // Limited access - don't show detailed breakdown
        message: 'Limited chart data'
      });
    } else {
      res.json({
        growth: monthlyCounts,
        employmentTypes: [employmentCounts.full_time, employmentCounts.part_time, employmentCounts.contractor]
      });
    }

  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

app.get('/api/dashboard/activity', authenticateToken, requireOrganizationOverviewAccess, async (req, res) => {
  try {
    const { profile } = req;
    const { supabase } = require('./config/supabase');

    // Check if user has limited access (organization_member)
    if (req.limitedAccess) {
      // Organization members can only see their own activity
      const { data: userEmployee, error: userEmployeeError } = await supabase
        .from('employees')
        .select('first_name, last_name, updated_at, created_at, employee_status')
        .eq('user_id', req.user.id)
        .eq('is_deleted', false)
        .single();

      if (userEmployeeError) {
        console.error('User employee activity error:', userEmployeeError);
        return res.json([]);
      }

      // Return only the user's own activity
      const activities = [];
      if (userEmployee) {
        const isNewEmployee = new Date(userEmployee.created_at).getTime() === new Date(userEmployee.updated_at).getTime();
        activities.push({
          type: isNewEmployee ? 'employee_hired' : 'employee_updated',
          message: isNewEmployee
            ? `Your profile was created`
            : `Your profile was updated`,
          created_at: userEmployee.updated_at
        });
      }

      return res.json(activities);
    }

    // Get recent employee updates (for admin and super_admin)
    let employeeQuery = supabase
      .from('employees')
      .select('first_name, last_name, updated_at, created_at, employee_status')
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .limit(5);

    // Filter by organization for non-super_admin users
    if (profile.role !== 'super_admin' && profile.organization_id) {
      employeeQuery = employeeQuery.eq('organization_id', profile.organization_id);
    }
    // For super_admin users, don't filter by organization (they can see all employees)

    const { data: recentEmployees, error: employeeError } = await employeeQuery;

    if (employeeError) {
      console.error('Employee activity error:', employeeError);
    }

    // Get recent timesheet entries (if any)
    let timesheetQuery = supabase
      .from('timesheets')
      .select('user_id, clock_in, clock_out, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    // Filter by organization for non-super_admin users
    if (profile.role !== 'super_admin' && profile.organization_id) {
      timesheetQuery = timesheetQuery.eq('organization_id', profile.organization_id);
    }
    // For super_admin users, don't filter by organization (they can see all timesheets)

    const { data: recentTimesheets, error: timesheetError } = await timesheetQuery;

    if (timesheetError) {
      console.error('Timesheet activity error:', timesheetError);
    }

    // Combine and format activity data
    const activities = [];

    // Add employee activities
    if (recentEmployees) {
      recentEmployees.forEach(employee => {
        const isNewEmployee = new Date(employee.created_at).getTime() === new Date(employee.updated_at).getTime();
        activities.push({
          type: isNewEmployee ? 'employee_hired' : 'employee_updated',
          message: isNewEmployee
            ? `New employee <strong>${employee.first_name} ${employee.last_name}</strong> was hired`
            : `<strong>${employee.first_name} ${employee.last_name}</strong> profile was updated`,
          created_at: employee.updated_at
        });
      });
    }

    // Add timesheet activities
    if (recentTimesheets) {
      recentTimesheets.forEach(timesheet => {
        activities.push({
          type: 'timesheet_updated',
          message: `Employee clocked ${timesheet.clock_out ? 'out' : 'in'}`,
          created_at: timesheet.created_at
        });
      });
    }

    // Sort by date and limit to 5 most recent
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    activities.splice(5);

    res.json(activities);

  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

app.post('/api/dashboard/export', authenticateToken, async (req, res) => {
  // TODO: Implement real export logic
  res.json({ downloadUrl: '/assets/sample-export.csv' });
});

// Note: Attendance Analytics API removed - not relevant for super admin role
// Super admin focuses on platform management, not employee attendance tracking

// Super Admin Platform Analytics API
app.get('/api/super-admin/analytics', authenticateToken, async (req, res) => {
  try {
    const { profile } = req;
    const { supabase } = require('./config/supabase');

    // Only allow super_admin access
    if (profile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super admin role required.' });
    }

    // Get comprehensive platform analytics
    const [
      { count: totalUsers },
      { count: totalOrganizations },
      { count: totalEmployees },
      { count: activeEmployees },
      { count: totalInvites },
      { count: pendingInvites },
      { count: acceptedInvites },
      { count: totalPayrolls },
      { count: completedPayrolls }
    ] = await Promise.all([
      // Total users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      
      // Total organizations
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      
      // Total employees
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      
      // Active employees
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_deleted', false),
      
      // Total invites
      supabase
        .from('invites')
        .select('*', { count: 'exact', head: true }),
      
      // Pending invites
      supabase
        .from('invites')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Accepted invites
      supabase
        .from('invites')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted'),
      
      // Total payrolls
      supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true }),
      
      // Completed payrolls
      supabase
        .from('payrolls')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
    ]);

    // Get user growth data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: userGrowthData } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    // Process user growth data by month
    const monthlyGrowth = {};
    if (userGrowthData) {
      userGrowthData.forEach(user => {
        const month = new Date(user.created_at).toISOString().substring(0, 7); // YYYY-MM
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
      });
    }

    // Get organization growth data
    const { data: orgGrowthData } = await supabase
      .from('organizations')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    // Process organization growth data by month
    const monthlyOrgGrowth = {};
    if (orgGrowthData) {
      orgGrowthData.forEach(org => {
        const month = new Date(org.created_at).toISOString().substring(0, 7);
        monthlyOrgGrowth[month] = (monthlyOrgGrowth[month] || 0) + 1;
      });
    }

    // Get recent activity from multiple sources
    const [
      { data: recentUsers },
      { data: recentOrgs },
      { data: recentEmployees },
      { data: recentPayrolls },
      { data: recentInvites }
    ] = await Promise.all([
      // Recent user signups
      supabase
        .from('users')
        .select('first_name, last_name, created_at, role, email')
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent organization creations
      supabase
        .from('organizations')
        .select('name, created_at, industry')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(3),
      
      // Recent employee additions
      supabase
        .from('employees')
        .select('first_name, last_name, created_at, department, position')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(4),
      
      // Recent payroll activities
      supabase
        .from('payrolls')
        .select('created_at, status, total_amount')
        .order('created_at', { ascending: false })
        .limit(3),
      
      // Recent invitations
      supabase
        .from('invites')
        .select('created_at, status, role')
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    // Combine and format activities
    const recentActivities = [];
    
    // Add user signups
    if (recentUsers) {
      recentUsers.forEach(user => {
        recentActivities.push({
          type: 'user_signup',
          title: 'New User Registration',
          description: `${user.first_name || 'User'} ${user.last_name || ''} joined as ${user.role}`,
          timestamp: user.created_at,
          icon: user.role === 'super_admin' ? 'crown' : user.role === 'admin' ? 'shield-alt' : 'user-plus',
          metadata: { role: user.role, email: user.email }
        });
      });
    }
    
    // Add organization creations
    if (recentOrgs) {
      recentOrgs.forEach(org => {
        recentActivities.push({
          type: 'organization_created',
          title: 'New Organization',
          description: `${org.name} organization created${org.industry ? ` in ${org.industry}` : ''}`,
          timestamp: org.created_at,
          icon: 'building',
          metadata: { industry: org.industry }
        });
      });
    }
    
    // Add employee additions
    if (recentEmployees) {
      recentEmployees.forEach(employee => {
        recentActivities.push({
          type: 'employee_added',
          title: 'New Employee',
          description: `${employee.first_name || 'Employee'} ${employee.last_name || ''} joined${employee.department ? ` in ${employee.department}` : ''}${employee.position ? ` as ${employee.position}` : ''}`,
          timestamp: employee.created_at,
          icon: 'user-tie',
          metadata: { department: employee.department, position: employee.position }
        });
      });
    }
    
    // Add payroll activities
    if (recentPayrolls) {
      recentPayrolls.forEach(payroll => {
        recentActivities.push({
          type: 'payroll_processed',
          title: 'Payroll Activity',
          description: `Payroll ${payroll.status} - €${payroll.total_amount || '0'}`,
          timestamp: payroll.created_at,
          icon: payroll.status === 'paid' ? 'check-circle' : payroll.status === 'pending' ? 'clock' : 'dollar-sign',
          metadata: { status: payroll.status, amount: payroll.total_amount }
        });
      });
    }
    
    // Add invitation activities
    if (recentInvites) {
      recentInvites.forEach(invite => {
        recentActivities.push({
          type: 'invite_sent',
          title: 'Invitation Activity',
          description: `Invitation ${invite.status} for ${invite.role} role`,
          timestamp: invite.created_at,
          icon: invite.status === 'accepted' ? 'user-check' : invite.status === 'pending' ? 'envelope' : 'user-times',
          metadata: { status: invite.status, role: invite.role }
        });
      });
    }
    
    // Sort all activities by timestamp (most recent first)
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Take only the most recent 10 activities
    const finalActivities = recentActivities.slice(0, 10);

    // Get organization distribution by size
    const { data: orgSizes } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('is_deleted', false);

    // Calculate organization sizes (employees per org)
    const orgSizeDistribution = { '1-5': 0, '6-20': 0, '21-50': 0, '50+': 0 };
    if (orgSizes) {
      for (const org of orgSizes) {
        const { count: employeeCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('is_deleted', false);
        
        const count = employeeCount || 0;
        if (count <= 5) orgSizeDistribution['1-5']++;
        else if (count <= 20) orgSizeDistribution['6-20']++;
        else if (count <= 50) orgSizeDistribution['21-50']++;
        else orgSizeDistribution['50+']++;
      }
    }

    // Calculate conversion rates
    const inviteConversionRate = totalInvites > 0 ? Math.round((acceptedInvites / totalInvites) * 100) : 0;
    const payrollCompletionRate = totalPayrolls > 0 ? Math.round((completedPayrolls / totalPayrolls) * 100) : 0;

    // Calculate growth rates
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    // Get user counts for growth calculation
    const [
      { count: usersThisMonth },
      { count: usersLastMonth },
      { count: usersThisWeek },
      { count: usersLastWeek },
      { count: orgsThisMonth },
      { count: orgsLastMonth },
      { count: employeesThisMonth },
      { count: employeesLastMonth }
    ] = await Promise.all([
      // Users this month
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString())
        .eq('is_deleted', false),
      
      // Users last month
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoMonthsAgo.toISOString())
        .lt('created_at', oneMonthAgo.toISOString())
        .eq('is_deleted', false),
      
      // Users this week
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString())
        .eq('is_deleted', false),
      
      // Users last week (previous 7 days)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .lt('created_at', oneWeekAgo.toISOString())
        .eq('is_deleted', false),
      
      // Organizations this month
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString())
        .eq('is_deleted', false),
      
      // Organizations last month
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoMonthsAgo.toISOString())
        .lt('created_at', oneMonthAgo.toISOString())
        .eq('is_deleted', false),
      
      // Employees this month
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString())
        .eq('is_deleted', false),
      
      // Employees last month
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoMonthsAgo.toISOString())
        .lt('created_at', oneMonthAgo.toISOString())
        .eq('is_deleted', false)
    ]);

    // Calculate growth percentages
    const userGrowthThisMonth = usersLastMonth > 0 ? 
      Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) : 
      (usersThisMonth > 0 ? 100 : 0);
    
    const userGrowthThisWeek = usersLastWeek > 0 ? 
      Math.round(((usersThisWeek - usersLastWeek) / usersLastWeek) * 100) : 
      (usersThisWeek > 0 ? 100 : 0);
    
    const orgGrowthThisMonth = orgsLastMonth > 0 ? 
      Math.round(((orgsThisMonth - orgsLastMonth) / orgsLastMonth) * 100) : 
      (orgsThisMonth > 0 ? 100 : 0);
    
    const employeeGrowthThisMonth = employeesLastMonth > 0 ? 
      Math.round(((employeesThisMonth - employeesLastMonth) / employeesLastMonth) * 100) : 
      (employeesThisMonth > 0 ? 100 : 0);

    // Calculate platform uptime change (mock for now - would come from monitoring)
    const uptimeChange = 0.1; // 0.1% improvement this week

    res.json({
      // Core metrics
      totalUsers: totalUsers || 0,
      totalOrganizations: totalOrganizations || 0,
      totalEmployees: totalEmployees || 0,
      activeEmployees: activeEmployees || 0,
      totalInvites: totalInvites || 0,
      pendingInvites: pendingInvites || 0,
      acceptedInvites: acceptedInvites || 0,
      totalPayrolls: totalPayrolls || 0,
      completedPayrolls: completedPayrolls || 0,
      
      // Growth data
      userGrowth: monthlyGrowth,
      organizationGrowth: monthlyOrgGrowth,
      
      // Distribution data
      organizationSizeDistribution: orgSizeDistribution,
      
      // Conversion rates
      inviteConversionRate: inviteConversionRate,
      payrollCompletionRate: payrollCompletionRate,
      
      // Recent activity
      recentActivities: finalActivities || [],
      
      // Platform health
      platformUptime: 99.9, // This would come from monitoring
      averageResponseTime: 120, // ms - would come from monitoring
      errorRate: 0.01, // 1% - would come from monitoring
      
      // Growth metrics
      userGrowthThisMonth: userGrowthThisMonth,
      userGrowthThisWeek: userGrowthThisWeek,
      orgGrowthThisMonth: orgGrowthThisMonth,
      employeeGrowthThisMonth: employeeGrowthThisMonth,
      uptimeChange: uptimeChange,
      
      // Raw counts for debugging
      usersThisMonth: usersThisMonth || 0,
      usersLastMonth: usersLastMonth || 0,
      usersThisWeek: usersThisWeek || 0,
      usersLastWeek: usersLastWeek || 0,
      orgsThisMonth: orgsThisMonth || 0,
      orgsLastMonth: orgsLastMonth || 0,
      employeesThisMonth: employeesThisMonth || 0,
      employeesLastMonth: employeesLastMonth || 0
    });

  } catch (error) {
    console.error('Super admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

// Payroll payment submission
app.post('/api/payroll/submit', authenticateToken, requirePayrollAccess, async (req, res) => {
  try {
    const { employee_id, hourly_rate, days_worked, hours_worked, amount, type, payment_method, date, notes, processed_by } = req.body;
    const { profile } = req;

    // Validate required fields
    if (!employee_id || !hourly_rate || !days_worked || !hours_worked || !amount || !type || !payment_method || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user has self-only access (organization_member)
    if (req.selfOnlyAccess) {
      // Organization members can only access their own payroll
      if (employee_id !== req.user.id) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'Organization members can only access their own payroll information'
        });
      }
    }

    // Validate that the calculated amount matches the provided amount
    const calculatedAmount = hourly_rate * hours_worked;
    if (Math.abs(calculatedAmount - amount) > 0.01) {
      return res.status(400).json({ error: 'Amount calculation mismatch' });
    }

    // TODO: In a real application, you would:
    // 1. Validate the employee exists and belongs to the user's organization
    // 2. Check if the user has permission to process payments
    // 3. Store the payment in a database with hourly_rate and hours_worked
    // 4. Integrate with payment processing services
    // 5. Send notifications to the employee

    // For now, we'll just return a success response
    const payment = {
      id: Date.now().toString(),
      employee_id,
      hourly_rate,
      days_worked,
      hours_worked,
      amount,
      type,
      payment_method,
      date,
      notes,
      processed_by,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('💰 Payment submitted:', {
      employee_id,
      hourly_rate: `€${hourly_rate}/hr`,
      days_worked: `${days_worked} days`,
      hours_worked: `${hours_worked} hours`,
      amount: `€${amount}`,
      type,
      payment_method,
      date
    });

    res.json({
      message: 'Payment submitted successfully',
      payment
    });

  } catch (error) {
    console.error('Payment submission error:', error);
    res.status(500).json({ error: 'Payment submission failed' });
  }
});

// Test route to verify server is responding
app.get('/test', (req, res) => {
  console.log('🧪 Test route hit');
  res.json({
    message: 'Server is responding!',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV,
    supabase: {
      url: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
      anonKey: process.env.SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
    }
  });
});

// Render deployment test endpoint
app.get('/render-test', (req, res) => {
  console.log('🔍 Render test endpoint hit');
  res.json({
    message: 'Render deployment is working!',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV,
    publicDir: __dirname + '/public',
    indexExists: require('fs').existsSync(__dirname + '/public/index.html'),
    files: require('fs').readdirSync(__dirname + '/public').slice(0, 10), // First 10 files
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  });
});

// Simple startup test endpoint
app.get('/startup-test', (req, res) => {
  console.log('🚀 Startup test endpoint hit');
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV
  });
});

// Configuration endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    environment: config.environment,
    baseUrl: config.baseUrl,
    isProduction: config.isProduction,
    corsOrigins: allowedOrigins,
    version: process.env.npm_package_version || '1.0.0',
    buildTime: new Date().toISOString()
  });
});



// Redirects and rewrites
app.get('/home', (req, res) => {
  res.redirect('/');
});

app.get('/register', (req, res) => {
  res.redirect('/');
});

app.get('/signin', (req, res) => {
  res.redirect('/');
});

app.get('/main', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/admin', (req, res) => {
  res.redirect('/dashboard');
});

// Remove trailing slashes
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    return res.redirect(req.path.slice(0, -1));
  }
  next();
});

// Root route is handled above - serving landing.html
// This conflicting route has been removed

// Serve test page (no JavaScript for debugging)
app.get('/test-simple', (req, res) => {
  console.log('🧪 Test simple route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/test-simple.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ test-simple.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ test-simple.html file not found');
    res.status(404).send('Test page not found');
  }
});



// Serve simple login page (minimal JavaScript for debugging)
app.get('/login-simple', (req, res) => {
  console.log('🔐 Simple login route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/login-simple.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ login-simple.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ login-simple.html file not found');
    res.status(404).send('Simple login page not found');
  }
});

// Serve dashboard page (main app with sidebar)
app.get('/dashboard', (req, res) => {
  console.log('🔍 Dashboard route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/dashboard.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ dashboard.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}-${Math.random()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ dashboard.html file not found');
    res.status(404).send('Dashboard page not found');
  }
});

// Serve users page
app.get('/users', (req, res) => {
  console.log('👥 Users route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/users.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ users.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ users.html file not found');
    res.status(404).send('Users page not found');
  }
});

// Serve login page
app.get('/login', (req, res) => {
  console.log('🔍 Login route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/login.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ login.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ login.html file not found');
    res.status(404).send('Login page not found');
  }
});

// Serve signup page
app.get('/signup', (req, res) => {
  console.log('🔍 Signup route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/signup.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ signup.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ signup.html file not found');
    res.status(404).send('Signup page not found');
  }
});

// Serve create-organization page
app.get('/create-organization', (req, res) => {
  console.log('🔍 Create organization route hit');
  const fs = require('fs');
  const filePath = __dirname + '/public/create-organization.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ create-organization.html file exists');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', `"${Date.now()}"`);
    res.sendFile(filePath);
  } else {
    console.log('❌ create-organization.html file not found');
    res.status(404).send('Create organization page not found');
  }
});

// Serve other pages
const pages = ['/organizations', '/payroll', '/settings', '/profile'];
pages.forEach(page => {
  app.get(page, (req, res) => {
    console.log(`🔍 ${page} route hit`);
    const fs = require('fs');
    const fileName = page.substring(1) + '.html';
    const filePath = __dirname + '/public/' + fileName;
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${fileName} file exists`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', `"${Date.now()}"`);
      res.sendFile(filePath);
    } else {
      console.log(`❌ ${fileName} file not found`);
      res.status(404).send(`${page} page not found`);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});



// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.path);
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔗 Server bound to 0.0.0.0:${PORT}`);
  console.log(`✅ Server is ready to accept connections`);
  console.log(`🌍 Public directory: ${__dirname}/public`);
  console.log(`📄 Index file exists: ${require('fs').existsSync(__dirname + '/public/index.html')}`);
  console.log(`📁 Files in public: ${require('fs').readdirSync(__dirname + '/public').length} files`);
}).on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  console.error('❌ Error details:', error);
  process.exit(1);
});

// Keep the server alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('❌ Error stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
