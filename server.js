const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const organizationRoutes = require('./routes/organizations');
const userRoutes = require('./routes/users');
const employeeRoutes = require('./routes/employees');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https://randomuser.me', 'https://api.dicebear.com'],
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
  skipFailedRequests: false // Count failed requests
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

// Serve static files
app.use(express.static('public'));

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
  skipFailedRequests: false
});

// API routes with specific rate limiting
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/organizations', apiLimiter, organizationRoutes);
app.use('/api/users', apiLimiter, authenticateToken, userRoutes);
app.use('/api/employees', apiLimiter, authenticateToken, employeeRoutes);

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Serve dashboard.html directly
app.get('/dashboard.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

// Serve users page
app.get('/users', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/users.html');
});

// Serve users.html directly
app.get('/users.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/users.html');
});

// Serve organizations page (public)
app.get('/organizations', (req, res) => {
    console.log('🔍 /organizations route hit');
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Referrer:', req.headers.referer || 'No referrer');
    res.sendFile(__dirname + '/public/organizations.html');
});

// Serve organizations.html directly (public)
app.get('/organizations.html', (req, res) => {
    console.log('🔍 /organizations.html route hit');
    console.log('🔍 Request URL:', req.url);
    console.log('🔍 Referrer:', req.headers.referer || 'No referrer');
    res.sendFile(__dirname + '/public/organizations.html');
});

// Serve payroll page
app.get('/payroll', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/payroll.html');
});

// Serve payroll page
app.get('/payroll.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/payroll.html');
});

// Serve analytics page
app.get('/analytics', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/analytics.html');
});

// Serve analytics.html directly
app.get('/analytics.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/analytics.html');
});

// Serve settings page
app.get('/settings', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/settings.html');
});

// Serve settings.html directly
app.get('/settings.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/settings.html');
});

// Serve test dashboard page
app.get('/test-dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/test-dashboard.html');
});

// Serve debug dashboard page
app.get('/dashboard-debug', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard-debug.html');
});

// Serve invite page
app.get('/invite/:inviteCode', (req, res) => {
  res.sendFile(__dirname + '/public/invite.html');
});

// Dashboard API endpoints
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const { profile } = req;
    const { supabase } = require('./config/supabase');

    // Handle super_admin users who don't have an organization_id
    if (profile.role === 'super_admin') {
      // Super admin can see all employees
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);

      const { count: activeEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_deleted', false);

      const { count: fullTimeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('employment_type', 'full_time')
        .eq('is_deleted', false);

      const { count: partTimeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('employment_type', 'part_time')
        .eq('is_deleted', false);

      const { count: contractorCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('employment_type', 'contractor')
        .eq('is_deleted', false);

      // Get recent hires (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: recentHires } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())
        .eq('is_deleted', false);

      const attendanceRate = totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 0;

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
    } else {
      // Regular users - filter by their organization
      if (!profile.organization_id) {
        return res.json({
          totalEmployees: 0,
          activeEmployees: 0,
          departments: 0,
          attendanceRate: 0,
          fullTimeCount: 0,
          partTimeCount: 0,
          contractorCount: 0,
          recentHires: 0
        });
      }

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

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.get('/api/dashboard/charts', authenticateToken, async (req, res) => {
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

    res.json({
      growth: monthlyCounts,
      employmentTypes: [employmentCounts.full_time, employmentCounts.part_time, employmentCounts.contractor]
    });

  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
  try {
    const { profile } = req;
    const { supabase } = require('./config/supabase');

    // Get recent employee updates
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

// Payroll payment submission
app.post('/api/payroll/submit', authenticateToken, async (req, res) => {
  try {
    const { employee_id, hourly_rate, days_worked, hours_worked, amount, type, payment_method, date, notes, processed_by } = req.body;
    
    // Validate required fields
    if (!employee_id || !hourly_rate || !days_worked || !hours_worked || !amount || !type || !payment_method || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
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
    environment: process.env.NODE_ENV
  });
});

// Redirects and rewrites
app.get('/home', (req, res) => {
  res.redirect('/');
});

app.get('/login', (req, res) => {
  res.redirect('/');
});

app.get('/register', (req, res) => {
  res.redirect('/');
});

app.get('/signin', (req, res) => {
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  res.redirect('/');
});

app.get('/app', (req, res) => {
  res.redirect('/dashboard');
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

// Serve the main application
app.get('/', (req, res) => {
  console.log('🔍 Root path (/) route hit');
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Referrer:', req.headers.referer || 'No referrer');
  console.log('🔍 __dirname:', __dirname);
  console.log('🔍 File path:', __dirname + '/public/index.html');
  
  // Check if file exists
  const fs = require('fs');
  const filePath = __dirname + '/public/index.html';
  if (fs.existsSync(filePath)) {
    console.log('✅ index.html file exists');
    res.sendFile(filePath);
  } else {
    console.log('❌ index.html file not found');
    res.status(404).send('index.html not found');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// SPA catch-all route - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Skip static file requests
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  
  console.log('🔄 SPA route hit:', req.path);
  console.log('🔄 Serving index.html for SPA routing');
  
  // Check if file exists
  const fs = require('fs');
  const filePath = __dirname + '/public/index.html';
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`🔗 Server bound to 0.0.0.0:${PORT}`);
}).on('error', (error) => {
  console.error('❌ Server failed to start:', error.message);
  process.exit(1);
});

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