// Immediate super admin check - runs before anything else
(function() {
  console.log('🚀 IMMEDIATE SUPER ADMIN CHECK - Starting before Dashboard class');
  
  try {
    const cachedProfile = localStorage.getItem('profile');
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      const profileData = parsed.profile || parsed;
      console.log('🔍 IMMEDIATE CHECK - Cached profile role:', profileData.role);
      
      if (profileData.role === 'super_admin') {
        console.log('👑 IMMEDIATE CHECK - Super admin detected! Ensuring org section stays hidden');
        
        // Immediately hide org required section
        document.addEventListener('DOMContentLoaded', function() {
          const orgSection = document.getElementById('orgRequiredSection');
          const mainContent = document.getElementById('mainContent');
          
          if (orgSection) {
            orgSection.style.display = 'none';
            orgSection.style.visibility = 'hidden';
            console.log('👑 IMMEDIATE CHECK - Org section forcibly hidden');
          }
          
          if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.visibility = 'visible';
            console.log('👑 IMMEDIATE CHECK - Main content shown');
          }
          
          // Add super admin class to body immediately
          document.body.classList.add('super-admin-immediate');
          console.log('👑 IMMEDIATE CHECK - Added super-admin-immediate class');
          
          // Add CSS to absolutely hide org section for super admin
          const style = document.createElement('style');
          style.textContent = `
            body.super-admin-immediate #orgRequiredSection,
            body.super-admin-immediate .org-required-section {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            body.super-admin-immediate #mainContent {
              display: block !important;
              visibility: visible !important;
            }
          `;
          document.head.appendChild(style);
          console.log('👑 IMMEDIATE CHECK - Added CSS to force hide org section');
        });
      }
    } else {
      console.log('🔍 IMMEDIATE CHECK - No cached profile found');
    }
  } catch (error) {
    console.error('❌ IMMEDIATE CHECK - Error:', error);
  }
})();

// Dashboard JavaScript
class Dashboard {
  constructor() {
    this.charts = {};
    this.currentPeriod = '7d';
    this.currentUser = null;
    this.init();
  }

  async init() {
    console.log('🚀 Dashboard initializing...');
    console.log('🔍 Current localStorage profile:', localStorage.getItem('profile'));

    // Always setup sidebar and event listeners first, regardless of auth status
    this.setupEventListeners();
    console.log('✅ Event listeners setup');

    this.resetSidebarState();
    this.loadSidebarState();
    console.log('✅ Sidebar state loaded');

    // Make the organization button visible
    const organizationBtn = document.getElementById('organizationBtn');
    if (organizationBtn) {
      console.log('🔍 Making organization button visible');
      organizationBtn.style.display = 'flex';
    } else {
      console.log('❌ Could not find organization button to make visible');
    }

    // Check organization requirement first
    await this.checkOrganizationAndInitialize();
  }

  async checkOrganizationAndInitialize() {
    try {
      console.log('🔍 Checking organization requirement and initializing dashboard...');
      
      // Try to get profile from cache first (for super admin check)
      let profileData = null;
      const cachedProfile = localStorage.getItem('profile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          profileData = parsed.profile || parsed;
          console.log('📱 Using cached profile for initial check:', profileData.role);
          
          // If cached profile shows super admin, show dashboard immediately
          if (profileData.role === 'super_admin') {
            console.log('👑 Cached super admin detected - showing dashboard immediately');
            this.showSuperAdminDashboard();
            return;
          }
        } catch (e) {
          console.log('⚠️ Failed to parse cached profile, will fetch from API');
        }
      }

      // Fetch user profile with longer timeout and retry
      const profile = await Promise.race([
        fetch('/api/auth/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(async res => {
          if (!res.ok) {
            throw new Error(`Profile fetch failed: ${res.status}`);
          }
          return res.json();
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout after 10 seconds')), 10000)
        )
      ]);

      console.log('🔍 Dashboard - Profile loaded:', profile);
      
      // Extract actual profile data if nested
      profileData = profile.profile || profile;
      
      // Store/update profile in localStorage for future cache checks
      localStorage.setItem('profile', JSON.stringify(profile));
      console.log('📱 Profile cached for future use');
      
      // Update navigation visibility immediately after profile load
      if (window.EmployeeHub && window.EmployeeHub.updateNavigationVisibility) {
        console.log('🔧 Calling shared navigation visibility update from dashboard');
        window.EmployeeHub.updateNavigationVisibility();
      } else {
        console.log('⚠️ EmployeeHub not available, trying direct navigation update');
        this.updateNavigationVisibilityDirectly(profileData);
      }
      
      // Role-based dashboard logic
      console.log('🔍 Profile data:', profileData);
      console.log('🔍 User role:', profileData.role);
      console.log('🔍 Organization ID:', profileData.organization_id);
      
      switch (profileData.role) {
        case 'super_admin':
          // Super admin ALWAYS sees website administration dashboard
          console.log('👑 Super admin detected - showing website administration dashboard');
          console.log('👑 Super admin bypasses organization requirement');
          this.showSuperAdminDashboard();
          return; // Exit here to prevent any further organization checks
          break;
          
        case 'organization_member':
          // Organization members see employee dashboard
          if (!profileData.organization_id) {
            console.log('❌ Organization required for organization_member');
            this.showOrganizationRequired();
          } else {
            console.log('👤 Organization member detected - showing employee dashboard');
            this.showOrganizationMemberDashboard();
          }
          break;
          
        case 'admin':
        case 'employee':
        default:
          // Regular users (NOT super admin) need organization to access dashboard
          if (profileData.role === 'super_admin') {
            // Super admin should never reach here due to switch statement, but as a safety net
            console.log('👑 Super admin detected in default case - redirecting to super admin dashboard');
            this.showSuperAdminDashboard();
          } else if (!profileData.organization_id) {
            console.log('❌ Organization required for role:', profileData.role);
            this.showOrganizationRequired();
          } else {
            console.log('✅ Organization check passed - showing organization dashboard');
            this.showMainDashboard();
            await this.loadDashboardData();
          }
          break;
      }
      
    } catch (error) {
      console.error('⚠️ Dashboard initialization error:', error);
      
      // Check if user is super admin even on error - they should never see org requirement
      try {
        const cachedProfile = JSON.parse(localStorage.getItem('profile') || '{}');
        const profileData = cachedProfile.profile || cachedProfile;
        
        if (profileData.role === 'super_admin') {
          console.log('👑 Super admin detected in error case - showing super admin dashboard anyway');
          this.showSuperAdminDashboard();
          return;
        }
      } catch (profileError) {
        console.error('❌ Error checking cached profile:', profileError);
      }
      
      // On error for non-super-admin users, show organization requirement for safety
      this.showOrganizationRequired();
    }
  }

  showOrganizationRequired() {
    console.log('🚫 Showing organization requirement screen');
    
    // NEVER show organization required for super admin - check again as safety
    try {
      const cachedProfile = localStorage.getItem('profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        const profileData = parsed.profile || parsed;
        if (profileData.role === 'super_admin') {
          console.log('👑 BLOCKED organization required for super admin - showing dashboard instead');
          this.showSuperAdminDashboard();
          return;
        }
      }
    } catch (e) {
      console.log('⚠️ Error checking profile in showOrganizationRequired');
    }
    
    const orgRequiredSection = document.getElementById('orgRequiredSection');
    const mainContent = document.getElementById('mainContent');
    
    if (orgRequiredSection && mainContent) {
      orgRequiredSection.style.display = 'block';
      mainContent.style.display = 'none';
      console.log('✅ Organization requirement screen displayed');
    } else {
      console.log('⚠️ Organization required section or main content not found');
      // Fallback: show a toast message
      this.showToast('You need to join an organization to access the dashboard', 'warning');
    }
  }

  showMainDashboard() {
    console.log('📊 Showing main organization dashboard');
    const orgRequiredSection = document.getElementById('orgRequiredSection');
    const mainContent = document.getElementById('mainContent');
    
    if (orgRequiredSection && mainContent) {
      orgRequiredSection.style.display = 'none';
      mainContent.style.display = 'block';
      console.log('✅ Main dashboard displayed');
    }

    // Continue with normal dashboard initialization (skip for super admin)
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    const profileData = profile.profile || profile;
    if (profileData.role !== 'super_admin') {
    this.continueNormalInitialization();
    }
  }

  showSuperAdminDashboard() {
    console.log('👑 Showing super admin dashboard');
    const orgRequiredSection = document.getElementById('orgRequiredSection');
    const mainContent = document.getElementById('mainContent');
    
    console.log('🔍 orgRequiredSection:', orgRequiredSection);
    console.log('🔍 mainContent:', mainContent);
    
    if (orgRequiredSection && mainContent) {
      orgRequiredSection.style.display = 'none';
      mainContent.style.display = 'block';
      console.log('✅ Super admin dashboard displayed');
    } else {
      console.log('❌ Could not find required elements for super admin dashboard');
    }

    // Update navigation visibility for super admin
    if (window.EmployeeHub && window.EmployeeHub.updateNavigationVisibility) {
      console.log('🔧 Calling shared navigation visibility update');
      window.EmployeeHub.updateNavigationVisibility();
    }

    // Add super admin class to body for CSS targeting
    document.body.classList.add('super-admin-view');
    
    // Immediately set user info from cached profile for super admin
    this.loadSuperAdminUserInfo();
    
    // User dropdown is now handled by inline HTML functions
    
    // Hide employee-specific sections immediately
    this.hideDepartmentAndAttendanceSections();
    
    // Immediately initialize growth indicators to prevent stuck loading states
    this.initializeGrowthIndicators();
    
    // Load super admin specific content (this replaces normal initialization)
    this.loadSuperAdminData();
    
    // Initialize super admin specific charts
    this.initializeSuperAdminCharts();
  }

  async initializeSuperAdminCharts() {
    console.log('📊 Initializing super admin specific charts...');
    
    // Only create charts relevant for super admin (platform management)
    this.createEmployeeGrowthChart(); // This shows user/organization growth
    
    // Skip attendance, department, and performance charts (employee management)
    console.log('📊 Skipping employee-specific charts for super admin');
    
    this.setupChartControls();
    
    // Enforce size constraints and set up observers
    this.enforceChartSizeConstraints();
    this.setupChartSizeObserver();
    this.setupMutationObserver();
    this.startChartSizeMonitoring();
    console.log('✅ Super admin charts initialized');
  }

  async continueNormalInitialization() {
    try {
      // Load dashboard data directly - server middleware handles auth
      await this.loadDashboardData();
      console.log('✅ Dashboard data loaded');

      try {
        await this.initializeCharts();
        console.log('✅ Charts initialized');

        // Enforce size constraints and set up observers
        this.enforceChartSizeConstraints();
        this.setupChartSizeObserver();
        this.setupMutationObserver();
        this.startChartSizeMonitoring();
        console.log('✅ Chart size constraints enforced');
      } catch (chartError) {
        console.error('❌ Chart initialization failed:', chartError);
        console.log('⚠️ Continuing without charts');
      }

      this.startDataRefresh();
      console.log('✅ Dashboard initialization complete');
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
    }
  }

  async loadSuperAdminData() {
    console.log('📈 Loading super admin statistics...');
    
    try {
      // Update page title and content for super admin
      const dashboardTitle = document.querySelector('.dashboard-title');
      if (dashboardTitle) {
        dashboardTitle.textContent = 'Super Admin Dashboard';
      }

      const welcomeSection = document.querySelector('.welcome-section h1');
      if (welcomeSection) {
        welcomeSection.textContent = 'Website Administration Dashboard';
      }

      const welcomeText = document.querySelector('.welcome-section p');
      if (welcomeText) {
        welcomeText.textContent = 'Monitor and manage the entire Chronos HR platform';
      }

      // Load website-wide statistics
      await this.loadWebsiteStats();
      await this.loadWebsiteCharts();
      await this.loadWebsiteActivity();

      // Initialize charts after loading data
      try {
        await this.initializeCharts();
        console.log('✅ Charts initialized');

        // Enforce size constraints and set up observers
        this.enforceChartSizeConstraints();
        this.setupChartSizeObserver();
        this.setupMutationObserver();
        this.startChartSizeMonitoring();
        console.log('✅ Chart size constraints enforced');
      } catch (chartError) {
        console.error('❌ Chart initialization failed:', chartError);
        console.log('⚠️ Continuing without charts');
      }

      this.startDataRefresh();
      this.startSuperAdminDataRefresh();
      console.log('✅ Super admin dashboard initialization complete');

    } catch (error) {
      console.error('❌ Error loading super admin data:', error);
    }
  }

  showOrganizationMemberDashboard() {
    console.log('👤 Showing organization member dashboard');
    const orgRequiredSection = document.getElementById('orgRequiredSection');
    const mainContent = document.getElementById('mainContent');
    
    if (orgRequiredSection && mainContent) {
      orgRequiredSection.style.display = 'none';
      mainContent.style.display = 'block';
      console.log('✅ Organization member dashboard displayed');
    }

    // Load organization member specific content
    this.loadOrganizationMemberData();
  }

  async loadOrganizationMemberData() {
    console.log('👤 Loading organization member dashboard data...');
    
    try {
      // Update page title and content for organization member
      const dashboardTitle = document.querySelector('.dashboard-title');
      if (dashboardTitle) {
        dashboardTitle.textContent = 'Employee Dashboard';
      }

      const welcomeSection = document.querySelector('.welcome-section h1');
      if (welcomeSection) {
        welcomeSection.textContent = 'Welcome to Your Employee Dashboard';
      }

      const welcomeText = document.querySelector('.welcome-section p');
      if (welcomeText) {
        welcomeText.textContent = 'Access your work information, payroll, and company updates';
      }

      // Replace the main dashboard content with organization member specific content
      this.createOrganizationMemberDashboard();

      // Load organization member specific data
      await this.loadEmployeeData();

      console.log('✅ Organization member dashboard initialization complete');

    } catch (error) {
      console.error('❌ Error loading organization member data:', error);
    }
  }

  createOrganizationMemberDashboard() {
    console.log('🎨 Creating organization member dashboard layout...');
    
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
      console.error('❌ Main content container not found');
      return;
    }

    // Create the organization member dashboard HTML
    mainContent.innerHTML = `
      <div class="org-member-dashboard">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <h1>Welcome to Your Employee Dashboard</h1>
          <p>Access your work information, payroll, and company updates</p>
        </div>

        <!-- Quick Stats Row -->
        <div class="quick-stats-row">
          <div class="stat-card org-member-stat">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="attendanceStatus">Present</div>
              <div class="stat-label">Attendance Status</div>
            </div>
          </div>
          
          <div class="stat-card org-member-stat">
            <div class="stat-icon">
              <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="upcomingEvents">3</div>
              <div class="stat-label">Upcoming Events</div>
            </div>
          </div>
          
          <div class="stat-card org-member-stat">
            <div class="stat-icon">
              <i class="fas fa-dollar-sign"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="latestPayroll">$2,450</div>
              <div class="stat-label">Latest Payroll</div>
            </div>
          </div>
          
          <div class="stat-card org-member-stat">
            <div class="stat-icon">
              <i class="fas fa-calendar-check"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" id="vacationDays">12</div>
              <div class="stat-label">Vacation Days Left</div>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="dashboard-grid">
          <!-- Left Column -->
          <div class="left-column">
            <!-- My Schedule -->
            <div class="dashboard-card org-member-card">
              <div class="card-header">
                <h3><i class="fas fa-calendar"></i> My Schedule</h3>
              </div>
              <div class="card-content">
                <div class="schedule-item">
                  <div class="schedule-time">9:00 AM - 5:00 PM</div>
                  <div class="schedule-day">Monday - Friday</div>
                  <div class="schedule-location">Office</div>
                </div>
                <div class="schedule-item">
                  <div class="schedule-time">10:00 AM - 2:00 PM</div>
                  <div class="schedule-day">Saturday</div>
                  <div class="schedule-location">Remote</div>
                </div>
              </div>
            </div>

            <!-- My Payroll -->
            <div class="dashboard-card org-member-card">
              <div class="card-header">
                <h3><i class="fas fa-money-bill-wave"></i> My Payroll</h3>
              </div>
              <div class="card-content">
                <div class="payroll-summary">
                  <div class="payroll-item">
                    <span class="label">Current Pay Period:</span>
                    <span class="value">$2,450.00</span>
                  </div>
                  <div class="payroll-item">
                    <span class="label">YTD Earnings:</span>
                    <span class="value">$29,400.00</span>
                  </div>
                  <div class="payroll-item">
                    <span class="label">Next Pay Date:</span>
                    <span class="value">July 25, 2025</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recent Payment Breakdowns -->
            <div class="dashboard-card org-member-card">
              <div class="card-header">
                <h3><i class="fas fa-chart-pie"></i> Recent Payment Breakdown</h3>
              </div>
              <div class="card-content">
                <div class="payment-breakdown">
                  <div class="breakdown-item">
                    <span class="label">Base Salary:</span>
                    <span class="value">$2,200.00</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="label">Overtime:</span>
                    <span class="value">$150.00</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="label">Bonus:</span>
                    <span class="value">$100.00</span>
                  </div>
                  <div class="breakdown-item total">
                    <span class="label">Total:</span>
                    <span class="value">$2,450.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="right-column">
            <!-- Downloadable Pay Stubs -->
            <div class="dashboard-card org-member-card">
              <div class="card-header">
                <h3><i class="fas fa-download"></i> Pay Stubs</h3>
              </div>
              <div class="card-content">
                <div class="pay-stub-list">
                  <div class="pay-stub-item">
                    <span class="stub-date">July 15, 2025</span>
                    <button class="btn btn-sm org-member-btn">Download PDF</button>
                  </div>
                  <div class="pay-stub-item">
                    <span class="stub-date">July 1, 2025</span>
                    <button class="btn btn-sm org-member-btn">Download PDF</button>
                  </div>
                  <div class="pay-stub-item">
                    <span class="stub-date">June 15, 2025</span>
                    <button class="btn btn-sm org-member-btn">Download PDF</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pay History -->
            <div class="dashboard-card org-member-card">
              <div class="card-header">
                <h3><i class="fas fa-history"></i> Pay History</h3>
              </div>
              <div class="card-content">
                <div class="pay-history">
                  <div class="history-item">
                    <span class="date">July 15, 2025</span>
                    <span class="amount">$2,450.00</span>
                  </div>
                  <div class="history-item">
                    <span class="date">July 1, 2025</span>
                    <span class="amount">$2,400.00</span>
                  </div>
                  <div class="history-item">
                    <span class="date">June 15, 2025</span>
                    <span class="amount">$2,350.00</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Time Off & Vacation -->
            <div class="dashboard-card org-member-card">
              <div class="card-header">
                <h3><i class="fas fa-umbrella-beach"></i> Time Off & Vacation</h3>
              </div>
              <div class="card-content">
                <div class="time-off-summary">
                  <div class="time-off-item">
                    <span class="label">Vacation Days Used:</span>
                    <span class="value">8 days</span>
                  </div>
                  <div class="time-off-item">
                    <span class="label">Sick Days Used:</span>
                    <span class="value">2 days</span>
                  </div>
                  <div class="time-off-item">
                    <span class="label">Remaining Vacation:</span>
                    <span class="value">12 days</span>
                  </div>
                </div>
                <div class="time-off-actions">
                  <button class="btn org-member-btn">Request Time Off</button>
                  <button class="btn org-member-btn">View Requests</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="bottom-row">
          <!-- Organization News & Announcements -->
          <div class="dashboard-card org-member-card full-width">
            <div class="card-header">
              <h3><i class="fas fa-bullhorn"></i> Company News & Announcements</h3>
            </div>
            <div class="card-content">
              <div class="announcements-list">
                <div class="announcement-item">
                  <div class="announcement-date">July 19, 2025</div>
                  <div class="announcement-title">Company Picnic This Friday!</div>
                  <div class="announcement-content">Join us for our annual company picnic at Central Park. Food, games, and team building activities included!</div>
                </div>
                <div class="announcement-item">
                  <div class="announcement-date">July 18, 2025</div>
                  <div class="announcement-title">New Sick Leave Policy</div>
                  <div class="announcement-content">Updated sick leave policy now includes mental health days. Check the employee handbook for details.</div>
                </div>
                <div class="announcement-item">
                  <div class="announcement-date">July 17, 2025</div>
                  <div class="announcement-title">Office Renovation Complete</div>
                  <div class="announcement-content">The new break room is now open! Come check out the new coffee machine and seating area.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Support & HR Contact -->
        <div class="support-section">
          <div class="dashboard-card org-member-card">
            <div class="card-header">
              <h3><i class="fas fa-headset"></i> Support & HR Contact</h3>
            </div>
            <div class="card-content">
              <div class="support-options">
                <button class="btn org-member-btn">
                  <i class="fas fa-comment"></i> Message HR
                </button>
                <button class="btn org-member-btn">
                  <i class="fas fa-file-alt"></i> Submit HR Request
                </button>
                <button class="btn org-member-btn">
                  <i class="fas fa-book"></i> Access Policies
                </button>
              </div>
            </div>
          </div>

          <!-- Security & Permissions -->
          <div class="dashboard-card org-member-card">
            <div class="card-header">
              <h3><i class="fas fa-shield-alt"></i> Security & Permissions</h3>
            </div>
            <div class="card-content">
              <div class="security-options">
                <button class="btn org-member-btn">
                  <i class="fas fa-key"></i> Update Password
                </button>
                <button class="btn org-member-btn">
                  <i class="fas fa-mobile-alt"></i> Manage 2FA
                </button>
                <button class="btn org-member-btn">
                  <i class="fas fa-desktop"></i> View Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    console.log('✅ Organization member dashboard layout created');
  }

  async loadEmployeeData() {
    console.log('👤 Loading employee-specific data...');
    
    try {
      // Load employee data from server
      const response = await fetch('/api/employee/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.updateEmployeeDashboard(data);
      } else {
        console.log('⚠️ Using mock employee data');
        this.updateEmployeeDashboardWithMockData();
      }
    } catch (error) {
      console.error('❌ Error loading employee data:', error);
      console.log('⚠️ Using mock employee data');
      this.updateEmployeeDashboardWithMockData();
    }
  }

  updateEmployeeDashboard(data) {
    // Update dashboard with real data from server
    console.log('📊 Updating employee dashboard with real data:', data);
    
    // Update attendance status
    const attendanceStatus = document.getElementById('attendanceStatus');
    if (attendanceStatus) {
      attendanceStatus.textContent = data.attendanceStatus || 'Present';
    }

    // Update other stats
    const upcomingEvents = document.getElementById('upcomingEvents');
    if (upcomingEvents) {
      upcomingEvents.textContent = data.upcomingEvents || '3';
    }

    const latestPayroll = document.getElementById('latestPayroll');
    if (latestPayroll) {
      latestPayroll.textContent = data.latestPayroll || '$2,450';
    }

    const vacationDays = document.getElementById('vacationDays');
    if (vacationDays) {
      vacationDays.textContent = data.vacationDays || '12';
    }
  }

  updateEmployeeDashboardWithMockData() {
    console.log('📊 Updating employee dashboard with mock data');
    
    // This will be handled by the static HTML we created
    // The mock data is already embedded in the HTML structure
  }

  async loadWebsiteStats() {
    try {
      console.log('📊 Loading real-time website statistics...');
      
      // Immediately clear loading states as a safety measure
      setTimeout(() => {
        console.log('🔄 Safety timeout: Clearing any remaining loading states...');
        this.clearLoadingStates();
      }, 5000);
      
      // Fetch real-time data from the API
      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const analytics = await response.json();
      console.log('📊 Real-time analytics data:', analytics);

      // Update stats cards with real-time data
      // Update stat cards with real-time data using specific IDs
      // First card - Total Employees
      const totalEmployeesEl = document.getElementById('totalEmployees');
      const totalEmployeesGrowthEl = document.getElementById('totalEmployeesGrowth');
      if (totalEmployeesEl) {
        totalEmployeesEl.textContent = analytics.totalEmployees || 0;
      }
      if (totalEmployeesGrowthEl) {
        console.log('📈 Updating totalEmployeesGrowth with:', analytics.employeeGrowthThisMonth);
        this.updateGrowthIndicatorById('totalEmployeesGrowth', analytics.employeeGrowthThisMonth, 'this month');
      }
      
      // Second card - Active Employees (we'll show total users for super admin)
      const activeEmployeesEl = document.getElementById('activeEmployees');
      const activeEmployeesGrowthEl = document.getElementById('activeEmployeesGrowth');
      if (activeEmployeesEl) {
        activeEmployeesEl.textContent = analytics.totalUsers || 0;
        // Update label to be more appropriate for super admin
        const label = activeEmployeesEl.parentElement.querySelector('.stat-label');
        if (label) label.textContent = 'Total Users';
      }
      if (activeEmployeesGrowthEl) {
        console.log('📈 Updating activeEmployeesGrowth with:', analytics.userGrowthThisMonth);
        this.updateGrowthIndicatorById('activeEmployeesGrowth', analytics.userGrowthThisMonth, 'this month');
      }
      
      // Third card - Departments (we'll show organizations for super admin)
      const departmentsEl = document.getElementById('departments');
      const departmentsGrowthEl = document.getElementById('departmentsGrowth');
      if (departmentsEl) {
        departmentsEl.textContent = analytics.totalOrganizations || 0;
        // Update label to be more appropriate for super admin
        const label = departmentsEl.parentElement.querySelector('.stat-label');
        if (label) label.textContent = 'Organizations';
      }
      if (departmentsGrowthEl) {
        console.log('📈 Updating departmentsGrowth with:', analytics.orgGrowthThisMonth);
        this.updateGrowthIndicatorById('departmentsGrowth', analytics.orgGrowthThisMonth, 'this month');
      }
      
      // Fourth card - Attendance Rate (we'll show platform uptime for super admin)
      const attendanceRateEl = document.getElementById('attendanceRate');
      const attendanceRateGrowthEl = document.getElementById('attendanceRateGrowth');
      if (attendanceRateEl) {
        attendanceRateEl.textContent = `${analytics.platformUptime || 99.9}%`;
        // Update label to be more appropriate for super admin
        const label = attendanceRateEl.parentElement.querySelector('.stat-label');
        if (label) label.textContent = 'Platform Uptime';
      }
      if (attendanceRateGrowthEl) {
        console.log('📈 Updating attendanceRateGrowth with:', analytics.uptimeChange);
        this.updateGrowthIndicatorById('attendanceRateGrowth', analytics.uptimeChange || 0, 'this week', true);
      }

      // Store analytics data for use in charts
      this.analyticsData = analytics;
      
      // Ensure all loading states are cleared (safety fallback)
      this.clearLoadingStates();

      // Also hide department and attendance related charts/sections
      this.hideDepartmentAndAttendanceSections();

    } catch (error) {
      console.error('❌ Error loading website stats:', error);
      
      // Fallback to basic stats from dashboard API
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const stats = await response.json();
          console.log('📊 Fallback stats data:', stats);
          
          // Update with fallback data using IDs
          console.log('📊 Using fallback data for stats...');
          
          // Total Employees
          const totalEmployeesEl = document.getElementById('totalEmployees');
          if (totalEmployeesEl) {
            totalEmployeesEl.textContent = stats.totalEmployees || 0;
            console.log('📈 FALLBACK: Updating totalEmployeesGrowth with:', stats.employeeGrowthThisMonth);
            this.updateGrowthIndicatorById('totalEmployeesGrowth', stats.employeeGrowthThisMonth || 0, 'this month');
          }
          
          // Active Employees (show total users for super admin)
          const activeEmployeesEl = document.getElementById('activeEmployees');
          if (activeEmployeesEl) {
            activeEmployeesEl.textContent = stats.totalUsers || 0;
            const label = activeEmployeesEl.parentElement.querySelector('.stat-label');
            if (label) label.textContent = 'Total Users';
            this.updateGrowthIndicatorById('activeEmployeesGrowth', stats.userGrowthThisMonth || 0, 'this month');
          }
          
          // Departments (show organizations for super admin)
          const departmentsEl = document.getElementById('departments');
          if (departmentsEl) {
            departmentsEl.textContent = stats.totalOrganizations || 0;
            const label = departmentsEl.parentElement.querySelector('.stat-label');
            if (label) label.textContent = 'Organizations';
            this.updateGrowthIndicatorById('departmentsGrowth', stats.orgGrowthThisMonth || 0, 'this month');
          }
          
          // Attendance Rate (show platform uptime for super admin)
          const attendanceRateEl = document.getElementById('attendanceRate');
          if (attendanceRateEl) {
            attendanceRateEl.textContent = `${stats.platformUptime || 99.9}%`;
            const label = attendanceRateEl.parentElement.querySelector('.stat-label');
            if (label) label.textContent = 'Platform Uptime';
            this.updateGrowthIndicatorById('attendanceRateGrowth', stats.uptimeChange || 0, 'this week', true);
          }
          
          // Clear any remaining loading states
          this.clearLoadingStates();
        }
      } catch (fallbackError) {
        console.error('❌ Fallback stats also failed:', fallbackError);
        // Last resort: clear all loading states
        this.clearLoadingStates();
      }
    }
  }

  hideDepartmentAndAttendanceSections() {
    // Get current user role
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    const profileData = profile.profile || profile;
    const userRole = profileData.role;

    console.log(`🔍 Hiding employee-specific sections for role: ${userRole}`);

    // Hide department distribution chart
    const departmentChart = document.querySelector('#departmentChart')?.closest('.chart-container');
    if (departmentChart) {
      departmentChart.style.display = 'none';
      departmentChart.style.visibility = 'hidden';
      console.log('📊 Hidden department chart');
    } else {
      console.log('⚠️ Department chart not found');
    }

    // Hide attendance trend chart - not relevant for super admin (platform management, not employee management)
    const attendanceChart = document.querySelector('#attendanceChart')?.closest('.chart-container');
    if (attendanceChart) {
      attendanceChart.style.display = 'none';
      attendanceChart.style.visibility = 'hidden';
      console.log('📊 Hidden attendance chart (Weekly Attendance Trend)');
    } else {
      console.log('⚠️ Attendance chart not found');
    }

    // Also try to hide by looking for the h3 title directly
    const attendanceSection = document.querySelector('h3:contains("Weekly Attendance Trend")')?.closest('.chart-container');
    if (attendanceSection) {
      attendanceSection.style.display = 'none';
      attendanceSection.style.visibility = 'hidden';
      console.log('📊 Hidden attendance section by title');
    }

    // Alternative approach - find by text content
    const allH3s = document.querySelectorAll('h3');
    allH3s.forEach(h3 => {
      if (h3.textContent.includes('Weekly Attendance Trend')) {
        const container = h3.closest('.chart-container');
        if (container) {
          container.style.display = 'none';
          container.style.visibility = 'hidden';
          console.log('📊 Hidden attendance section by text content');
        }
      }
    });

    // Hide performance metrics chart (employee-specific)
    const performanceChart = document.querySelector('#performanceChart')?.closest('.chart-container');
    if (performanceChart) {
      performanceChart.style.display = 'none';
      performanceChart.style.visibility = 'hidden';
      console.log('📊 Hidden performance chart');
    } else {
      console.log('⚠️ Performance chart not found');
    }

    // Add CSS rule to force hide attendance sections for super admin
    if (userRole === 'super_admin') {
      const style = document.createElement('style');
      style.textContent = `
        /* Hide attendance chart container */
        body.super-admin-view #attendanceChart,
        body.super-admin-view .chart-container:has(#attendanceChart),
        body.super-admin-view .dashboard-charts-bottom .chart-container:first-child {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* Hide any container with "Weekly Attendance Trend" title */
        body.super-admin-view h3[data-text*="Weekly Attendance"],
        body.super-admin-view .chart-header:has(h3:contains("Weekly Attendance")) {
          display: none !important;
        }
        
        /* Hide performance metrics for super admin */
        body.super-admin-view #performanceChart,
        body.super-admin-view .chart-container:has(#performanceChart) {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Hide department chart for super admin */
        body.super-admin-view #departmentChart,
        body.super-admin-view .chart-container:has(#departmentChart) {
          display: none !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(style);
      console.log('📊 Added comprehensive CSS rules to hide employee-specific sections');
    }

    console.log(`✅ Completed hiding employee-specific sections for role: ${userRole}`);
  }

  async loadWebsiteCharts() {
    try {
      console.log('📈 Loading real-time website charts...');
      
      // Use analytics data if available, otherwise fetch it
      let analyticsData = this.analyticsData;
      if (!analyticsData) {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/super-admin/analytics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          analyticsData = await response.json();
        }
      }

      // Process real-time user growth data
      const userGrowth = analyticsData?.userGrowth || {};
      const orgGrowth = analyticsData?.organizationGrowth || {};
      
      // Generate labels for the last 6 months
      const labels = [];
      const userData = [];
      const orgData = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        labels.push(monthLabel);
        userData.push(userGrowth[monthKey] || 0);
        orgData.push(orgGrowth[monthKey] || 0);
      }

      // Create cumulative data for better visualization
      let cumulativeUsers = 0;
      let cumulativeOrgs = 0;
      const cumulativeUserData = userData.map(count => {
        cumulativeUsers += count;
        return cumulativeUsers;
      });
      const cumulativeOrgData = orgData.map(count => {
        cumulativeOrgs += count;
        return cumulativeOrgs;
      });

      const chartData = {
        labels: labels,
        datasets: [{
          label: 'User Growth',
          data: cumulativeUserData,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        }, {
          label: 'Organization Growth',
          data: cumulativeOrgData,
          borderColor: '#51cf66',
          backgroundColor: 'rgba(81, 207, 102, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1'
        }]
      };

      // Update existing chart or create new one
      const chartCanvas = document.getElementById('employeeGrowthChart');
      if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.dashboardChart) {
          window.dashboardChart.destroy();
        }
        
        window.dashboardChart = new Chart(ctx, {
          type: 'line',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: 'Chronos HR Platform Growth',
                font: {
                  size: 16,
                  weight: 'bold'
                }
              },
              legend: {
                display: true,
                position: 'top'
              }
            },
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                },
                ticks: {
                  color: '#6b7280'
                },
                title: {
                  display: true,
                  text: 'Users'
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  color: '#6b7280'
                },
                title: {
                  display: true,
                  text: 'Organizations'
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#6b7280'
                }
              }
            }
          }
        });
      }

    } catch (error) {
      console.error('❌ Error loading website charts:', error);
      
      // Fallback to static data if API fails
      const fallbackData = {
        labels: ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'],
        datasets: [{
          label: 'Platform User Growth',
          data: [45, 78, 125, 168, 205, 247],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };

      const chartCanvas = document.getElementById('employeeGrowthChart');
      if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        
        if (window.dashboardChart) {
          window.dashboardChart.destroy();
        }
        
        window.dashboardChart = new Chart(ctx, {
          type: 'line',
          data: fallbackData,
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Chronos HR Platform Growth (Fallback)',
                font: {
                  size: 16,
                  weight: 'bold'
                }
              },
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                },
                ticks: {
                  color: '#6b7280'
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#6b7280'
                }
              }
            }
          }
        });
      }
    }
  }

  async loadWebsiteActivity() {
    console.log('📋 Loading real-time website activity...');
    
    const activityContainer = document.querySelector('.activity-feed') || document.getElementById('activityFeed');
    if (!activityContainer) {
      console.error('❌ Activity container not found');
      return;
    }

    // Show loading state
    this.showActivityLoading(activityContainer);
    
    try {
      console.log('🔍 Current user role:', JSON.parse(localStorage.getItem('profile') || '{}')?.role);
      
      // Try to fetch analytics data
      let analyticsData = this.analyticsData;
      if (!analyticsData) {
        console.log('📡 Fetching analytics data from API...');
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('❌ No auth token found');
          this.showActivityError(activityContainer, 'Authentication required');
          return;
        }
        
        const response = await Promise.race([
          fetch('/api/super-admin/analytics', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API timeout')), 10000)
          )
        ]);

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        analyticsData = await response.json();
        console.log('✅ Analytics data fetched successfully');
      }

      // Process real-time activities
      const recentActivities = analyticsData?.recentActivities || [];
      console.log('📊 Activity data received:', recentActivities.length, 'activities');
      
      if (recentActivities.length > 0) {
        console.log('📋 First few activities:', recentActivities.slice(0, 3));
        this.displayActivities(activityContainer, recentActivities);
      } else {
        console.log('📋 No activities found - showing empty state');
        this.showNoActivity(activityContainer);
      }

    } catch (error) {
      console.error('❌ Error loading website activity:', error);
      this.showActivityError(activityContainer, error.message);
    }
  }

  showActivityLoading(container) {
    container.innerHTML = `
      <div class="no-data-state">
        <div class="no-data-icon">
          <i class="fas fa-spinner fa-spin" style="color: #6b7280;"></i>
        </div>
        <div class="no-data-text">
          <h4>Loading Activities...</h4>
          <p>Fetching real-time platform data</p>
        </div>
      </div>
    `;
  }

  showNoActivity(container) {
    container.innerHTML = `
      <div class="no-data-state">
        <div class="no-data-icon">
          <i class="fas fa-inbox"></i>
        </div>
        <div class="no-data-text">
          <h4>No Recent Activity</h4>
          <p>Platform activity will appear here when data is available</p>
        </div>
      </div>
    `;
  }

  showActivityError(container, errorMessage) {
    container.innerHTML = `
      <div class="no-data-state">
        <div class="no-data-icon">
          <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
        </div>
        <div class="no-data-text">
          <h4>Unable to Load Activities</h4>
          <p>${errorMessage}</p>
        </div>
      </div>
    `;
    
    // Retry after 10 seconds
    setTimeout(() => {
      console.log('🔄 Retrying activity load...');
      this.loadWebsiteActivity();
    }, 10000);
  }

  displayActivities(container, activities) {
    container.innerHTML = ''; // Clear container

        activities.forEach(activity => {
          const activityElement = document.createElement('div');
          activityElement.className = 'activity-item';
      
      // Use the structured activity data format
      const title = activity.title || 'Platform Activity';
      const description = activity.description || 'Activity occurred';
      const icon = activity.icon || 'info-circle';
      const timeAgo = this.timeAgo(new Date(activity.timestamp || activity.created_at));
      
      // Add activity type class for styling
      activityElement.classList.add(`activity-${activity.type || 'general'}`);
      
          activityElement.innerHTML = `
            <div class="activity-icon">
          <i class="fas fa-${icon}"></i>
            </div>
            <div class="activity-content">
          <div class="activity-title">${title}</div>
          <div class="activity-desc">${description}</div>
          <div class="activity-time">${timeAgo}</div>
            </div>
          `;
      container.appendChild(activityElement);
        });

    console.log(`✅ Displayed ${activities.length} activities`);
  }

  getActivityIcon(type) {
    const icons = {
      'user_signup': 'user-plus',
      'organization_created': 'building',
      'user_login': 'shield-alt',
      'default': 'info-circle'
    };
    return icons[type] || icons.default;
  }

  updateGrowthIndicator(statCard, growthValue, timePeriod, isPercentage = false) {
    const growthElement = statCard.querySelector('.stat-change');
    if (!growthElement) {
      console.log('⚠️ Growth indicator element not found');
      return;
    }

    if (growthValue === undefined || growthValue === null) {
      growthElement.textContent = 'No change';
      growthElement.className = 'stat-change neutral';
      return;
    }

    const formattedValue = isPercentage ? 
      `${growthValue > 0 ? '+' : ''}${growthValue.toFixed(1)}%` : 
      `${growthValue > 0 ? '+' : ''}${growthValue}%`;

    growthElement.textContent = `${formattedValue} ${timePeriod}`;
    
    // Update CSS class based on growth direction
    growthElement.className = 'stat-change';
    if (growthValue > 0) {
      growthElement.classList.add('positive');
    } else if (growthValue < 0) {
      growthElement.classList.add('negative');
    } else {
      growthElement.classList.add('neutral');
    }

    console.log(`📈 Updated growth indicator: ${formattedValue} ${timePeriod}`);
  }

  updateGrowthIndicatorById(elementId, growthValue, timePeriod, isPercentage = false) {
    const growthElement = document.getElementById(elementId);
    if (!growthElement) {
      console.log(`⚠️ Growth indicator element with ID '${elementId}' not found`);
      return;
    }

    console.log(`📊 Processing growth for ${elementId}:`, growthValue, typeof growthValue);

    // Handle undefined/null values
    if (growthValue === undefined || growthValue === null) {
      console.log(`📊 ${elementId}: No data - showing 'No change'`);
      growthElement.textContent = 'No change';
      growthElement.className = 'stat-change neutral';
      return;
    }

    const value = isPercentage ? growthValue : parseFloat(growthValue);
    
    // Handle all numeric values including 0
    if (value > 0) {
      const formattedValue = `+${value.toFixed(1)}%`;
      growthElement.textContent = `${formattedValue} ${timePeriod}`;
      growthElement.className = 'stat-change positive';
      console.log(`📊 ${elementId}: Positive growth - ${formattedValue} ${timePeriod}`);
    } else if (value < 0) {
      const formattedValue = `${value.toFixed(1)}%`;
      growthElement.textContent = `${formattedValue} ${timePeriod}`;
      growthElement.className = 'stat-change negative';
      console.log(`📊 ${elementId}: Negative growth - ${formattedValue} ${timePeriod}`);
    } else {
      // value === 0
      growthElement.textContent = 'No change';
      growthElement.className = 'stat-change neutral';
      console.log(`📊 ${elementId}: Zero growth - No change`);
    }
  }

  clearLoadingStates() {
    // Ensure no growth indicators are stuck on "Loading..."
    const growthIds = ['totalEmployeesGrowth', 'activeEmployeesGrowth', 'departmentsGrowth', 'attendanceRateGrowth'];
    
    growthIds.forEach(id => {
      const element = document.getElementById(id);
      if (element && element.textContent === 'Loading...') {
        console.log(`⚠️ Clearing stuck loading state for ${id}`);
        element.textContent = 'No change';
        element.className = 'stat-change neutral';
      }
    });
  }

  initializeGrowthIndicators() {
    console.log('🔄 Initializing growth indicators immediately...');
    const growthIds = ['totalEmployeesGrowth', 'activeEmployeesGrowth', 'departmentsGrowth', 'attendanceRateGrowth'];
    
    growthIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        console.log(`📊 Initializing ${id} to "No change"`);
        element.textContent = 'No change';
        element.className = 'stat-change neutral';
      } else {
        console.log(`⚠️ Element ${id} not found during initialization`);
      }
    });
  }

  loadSuperAdminUserInfo() {
    console.log('👑 Loading super admin user info immediately...');
    
    try {
      // Get profile from localStorage
      const cachedProfile = localStorage.getItem('profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        const profileData = parsed.profile || parsed;
        
        console.log('📱 Using cached profile for user info:', profileData);
        
        // Set currentUser for later use
        this.currentUser = profileData;
        
        // Immediately update user display elements
        const userNameEls = document.querySelectorAll('.user-name');
        const userRoleEls = document.querySelectorAll('.user-role');
        const userEmailEls = document.querySelectorAll('.user-email');
        const userAvatarEls = document.querySelectorAll('.user-avatar');
        
        const fullName = `${profileData.first_name || 'Super'} ${profileData.last_name || 'Admin'}`;
        const email = profileData.email || 'super.admin@chronos.hr';
        const role = 'Super Admin';
        const initials = `${(profileData.first_name || 'S').charAt(0)}${(profileData.last_name || 'A').charAt(0)}`.toUpperCase();
        
        console.log(`👤 Updating profile: ${fullName} (${email}) - ${role}`);
        
        // Update all name elements
        userNameEls.forEach((el, index) => {
          console.log(`📝 Updating user name element ${index + 1} to: ${fullName}`);
          el.textContent = fullName;
        });
        
        // Update all role elements
        userRoleEls.forEach((el, index) => {
          console.log(`🎭 Updating user role element ${index + 1} to: ${role}`);
          el.textContent = role;
        });
        
        // Update all email elements
        userEmailEls.forEach((el, index) => {
          console.log(`📧 Updating user email element ${index + 1} to: ${email}`);
          el.textContent = email;
        });
        
        // Update all avatar elements
        userAvatarEls.forEach((el, index) => {
          console.log(`🖼️ Updating user avatar element ${index + 1}`);
          if (el.tagName === 'IMG') {
            // Different sizes for different contexts
            const size = el.closest('.dropdown-avatar') ? '40' : '48';
            el.src = `https://ui-avatars.com/api/?name=${initials}&background=4e8cff&color=fff&size=${size}`;
            el.alt = fullName;
          } else {
            el.textContent = initials;
          }
        });
        
        console.log('✅ Super admin user info updated successfully');
        
      } else {
        console.log('⚠️ No cached profile found for super admin');
        
        // Fallback to default super admin info
        this.setFallbackSuperAdminInfo();
      }
    } catch (error) {
      console.error('❌ Error loading super admin user info:', error);
      this.setFallbackSuperAdminInfo();
    }
  }

  setFallbackSuperAdminInfo() {
    console.log('🔧 Setting fallback super admin info...');
    
    const userNameEls = document.querySelectorAll('.user-name');
    const userRoleEls = document.querySelectorAll('.user-role');
    const userEmailEls = document.querySelectorAll('.user-email');
    const userAvatarEls = document.querySelectorAll('.user-avatar');
    
    const fallbackName = 'Super Admin';
    const fallbackEmail = 'admin@chronos.hr';
    const fallbackRole = 'Super Admin';
    const fallbackInitials = 'SA';
    
    userNameEls.forEach(el => el.textContent = fallbackName);
    userRoleEls.forEach(el => el.textContent = fallbackRole);
    userEmailEls.forEach(el => el.textContent = fallbackEmail);
    userAvatarEls.forEach(el => {
      if (el.tagName === 'IMG') {
        const size = el.closest('.dropdown-avatar') ? '40' : '48';
        el.src = `https://ui-avatars.com/api/?name=${fallbackInitials}&background=4e8cff&color=fff&size=${size}`;
        el.alt = fallbackName;
      } else {
        el.textContent = fallbackInitials;
      }
    });
    
    console.log('✅ Fallback super admin info set');
  }

  initializeUserDropdown() {
    console.log('🔽 Initializing user profile dropdown...');
    
    const dropdownTrigger = document.getElementById('userProfileDropdown');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    const dropdownLogout = document.getElementById('dropdownLogout');
    
    console.log('🔍 DROPDOWN DEBUG: Elements check:', {
      trigger: !!dropdownTrigger,
      menu: !!dropdownMenu,
      logout: !!dropdownLogout
    });
    
    if (!dropdownTrigger || !dropdownMenu) {
      console.log('❌ DROPDOWN DEBUG: Elements not found!');
      console.log('❌ Trigger element:', dropdownTrigger);
      console.log('❌ Menu element:', dropdownMenu);
      
      // Try to find them with different selectors
      const allDropdowns = document.querySelectorAll('[id*="dropdown"]');
      console.log('🔍 All elements with "dropdown" in ID:', allDropdowns);
      
      return;
    }
    
    console.log('✅ DROPDOWN DEBUG: Both elements found successfully');
    
    // Toggle dropdown on click
    dropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('🔥 DROPDOWN CLICK DETECTED!');
      console.log('🔍 Click event:', e);
      console.log('🔍 Target:', e.target);
      console.log('🔍 Current target:', e.currentTarget);
      
      const isOpen = dropdownMenu.classList.contains('show');
      console.log('🔍 Is currently open:', isOpen);
      console.log('🔍 Menu classes before:', dropdownMenu.className);
      console.log('🔍 Trigger classes before:', dropdownTrigger.className);
      
      if (isOpen) {
        console.log('🔼 Attempting to close dropdown...');
        this.closeUserDropdown();
      } else {
        console.log('🔽 Attempting to open dropdown...');
        this.openUserDropdown();
      }
      
      // Check state after
      setTimeout(() => {
        console.log('🔍 Menu classes after:', dropdownMenu.className);
        console.log('🔍 Trigger classes after:', dropdownTrigger.className);
      }, 100);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownTrigger.contains(e.target)) {
        this.closeUserDropdown();
      }
    });
    
    // Handle logout from dropdown
    if (dropdownLogout) {
      dropdownLogout.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🚪 Logout clicked from dropdown');
        this.logout();
      });
    }
    
    // Show/hide super admin items based on role
    this.updateDropdownForRole();
    
    console.log('✅ User dropdown initialized');
  }
  
  openUserDropdown() {
    console.log('🔽 Opening user dropdown');
    const dropdownTrigger = document.getElementById('userProfileDropdown');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    
    console.log('🔍 OPEN DEBUG: Elements found:', {
      trigger: !!dropdownTrigger,
      menu: !!dropdownMenu
    });
    
    if (dropdownTrigger && dropdownMenu) {
      console.log('🔽 Adding active/show classes...');
      dropdownTrigger.classList.add('active');
      dropdownMenu.classList.add('show');
      
      console.log('✅ Classes added:', {
        triggerClasses: dropdownTrigger.className,
        menuClasses: dropdownMenu.className
      });
    } else {
      console.log('❌ OPEN DEBUG: Elements not found in openUserDropdown');
    }
  }
  
  closeUserDropdown() {
    console.log('🔼 Closing user dropdown');
    const dropdownTrigger = document.getElementById('userProfileDropdown');
    const dropdownMenu = document.getElementById('userDropdownMenu');
    
    console.log('🔍 CLOSE DEBUG: Elements found:', {
      trigger: !!dropdownTrigger,
      menu: !!dropdownMenu
    });
    
    if (dropdownTrigger && dropdownMenu) {
      console.log('🔼 Removing active/show classes...');
      dropdownTrigger.classList.remove('active');
      dropdownMenu.classList.remove('show');
      
      console.log('✅ Classes removed:', {
        triggerClasses: dropdownTrigger.className,
        menuClasses: dropdownMenu.className
      });
    } else {
      console.log('❌ CLOSE DEBUG: Elements not found in closeUserDropdown');
    }
  }
  
  updateDropdownForRole() {
    console.log('👑 Updating dropdown for user role');
    
    try {
      const cachedProfile = localStorage.getItem('profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        const profileData = parsed.profile || parsed;
        
        const superAdminItems = document.querySelectorAll('.super-admin-only');
        
        if (profileData.role === 'super_admin') {
          console.log('👑 Showing super admin dropdown items');
          superAdminItems.forEach(item => {
            item.style.display = 'flex';
          });
        } else {
          console.log('👤 Hiding super admin dropdown items');
          superAdminItems.forEach(item => {
            item.style.display = 'none';
          });
        }
      }
    } catch (error) {
      console.error('❌ Error updating dropdown for role:', error);
    }
  }

  // Security: Clear all user data on logout
  logout() {
    console.log('🚪 Logging out user...');
    
    // Close dropdown first
    this.closeUserDropdown();
    
    // Clear all cached data
    localStorage.clear();
    sessionStorage.clear(); // Clear session data too
    window.location.href = '/login';
  }

  async loadDashboardData() {
    try {
      console.log('📊 Loading dashboard data...');
      const token = localStorage.getItem('token');

      // Check if user is authenticated
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        this.logout(); // Use logout method to ensure clean state
        return;
      }

      // Load dashboard stats
      await this.loadStats();
      
      // Load chart data
      await this.loadChartData();
      
      // Load activity data
      await this.loadActivityData();

      // Update user info
      await this.updateUserInfo();
      
      // User dropdown is now handled by inline HTML functions

      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Dashboard data loading failed:', error);
      
      // Check if this is an organization_member without organization_id
      const profile = JSON.parse(localStorage.getItem('profile') || '{}');
      const profileData = profile.profile || profile;
      
      if (profileData.role === 'organization_member' && !profileData.organization_id) {
        console.log('⚠️ Organization member without organization - showing organization requirement');
        this.showOrganizationRequired();
        return;
      }
      
      // If there's an auth error, redirect to login
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('⚠️ Auth error detected, redirecting to login');
        this.logout();
      } else {
        this.showToast('Failed to load dashboard data', 'error');
      }
    }
  }

  async loadStats() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Stats fetch failed: ${response.status}`);
      }

      const data = await response.json();
      this.updateStats(data);
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      throw error;
    }
  }

  async loadChartData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/charts?period=${this.currentPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Charts fetch failed: ${response.status}`);
      }

      const data = await response.json();
      this.updateCharts(data);
    } catch (error) {
      console.error('❌ Error loading chart data:', error);
      throw error;
    }
  }

  async loadActivityData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/activity', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Activity fetch failed: ${response.status}`);
      }

      const data = await response.json();
      this.updateActivity(data.activities);
    } catch (error) {
      console.error('❌ Error loading activity data:', error);
      throw error;
    }
  }

  showOrganizationSection() {
    console.log('🔍 showOrganizationSection called');
    console.log('🔍 Current URL:', window.location.href);
    try {
      document.getElementById('mainDashboard').classList.add('hidden');
      document.getElementById('orgSetupSection').classList.add('hidden');
      document.getElementById('inviteSection').classList.add('hidden');
      document.getElementById('organizationSection').classList.remove('hidden');
      console.log('🔍 About to load organization data');
      this.loadOrganizationData();
      console.log('🔍 Organization data loaded successfully');
    } catch (error) {
      console.error('❌ Error in showOrganizationSection:', error);
    }
  }

  updateStats(data) {
    console.log('📊 Updating dashboard stats with data:', data);
    
    // Get user role to determine which stats to show
    const userRole = window.currentUserProfile?.role || 'employee';
    
    if (userRole === 'admin') {
      // Admin-specific statistics
      this.updateElement('totalEmployees', data.totalEmployees || 0);
      this.updateElement('activeEmployees', data.activeEmployees || 0);
      this.updateElement('departments', data.departments || 0);
      this.updateElement('attendanceRate', `${data.attendanceRate || 0}%`);
      
      // Update stat card labels for admin
      this.updateStatCardLabel('totalEmployees', 'Total Team Members');
      this.updateStatCardLabel('activeEmployees', 'Active Employees');
      this.updateStatCardLabel('departments', 'Departments Managed');
      this.updateStatCardLabel('attendanceRate', 'Team Attendance Rate');
      
      // Add admin-specific stats if available
      if (data.pendingApprovals !== undefined) {
        this.updateElement('pendingApprovals', data.pendingApprovals || 0);
        this.updateStatCardLabel('pendingApprovals', 'Pending Approvals');
      }
      
      if (data.averagePerformance !== undefined) {
        this.updateElement('averagePerformance', `${data.averagePerformance || 0}/10`);
        this.updateStatCardLabel('averagePerformance', 'Avg Team Performance');
      }
      
      if (data.managementEfficiency !== undefined) {
        this.updateElement('managementEfficiency', data.managementEfficiency || 0);
        this.updateStatCardLabel('managementEfficiency', 'Employees per Dept');
      }
      
      // Update employment type breakdown for admin
      if (data.fullTimeCount !== undefined) {
        this.updateElement('fullTimeCount', data.fullTimeCount || 0);
        this.updateStatCardLabel('fullTimeCount', 'Full-Time Employees');
      }
      
      if (data.partTimeCount !== undefined) {
        this.updateElement('partTimeCount', data.partTimeCount || 0);
        this.updateStatCardLabel('partTimeCount', 'Part-Time Employees');
      }
      
      if (data.contractorCount !== undefined) {
        this.updateElement('contractorCount', data.contractorCount || 0);
        this.updateStatCardLabel('contractorCount', 'Contractors');
      }
      
      if (data.recentHires !== undefined) {
        this.updateElement('recentHires', data.recentHires || 0);
        this.updateStatCardLabel('recentHires', 'Recent Hires (7 days)');
      }
      
    } else if (userRole === 'super_admin') {
      // Super admin statistics (website-wide)
      this.updateElement('totalEmployees', data.totalEmployees || 0);
      this.updateElement('activeEmployees', data.activeEmployees || 0);
      this.updateElement('departments', data.departments || 0);
      this.updateElement('attendanceRate', `${data.attendanceRate || 0}%`);
      
      // Update stat card labels for super admin
      this.updateStatCardLabel('totalEmployees', 'Total Platform Users');
      this.updateStatCardLabel('activeEmployees', 'Active Users');
      this.updateStatCardLabel('departments', 'Organizations');
      this.updateStatCardLabel('attendanceRate', 'Platform Uptime');
      
      // Update employment type breakdown
      this.updateElement('fullTimeCount', data.fullTimeCount || 0);
      this.updateElement('partTimeCount', data.partTimeCount || 0);
      this.updateElement('contractorCount', data.contractorCount || 0);
      this.updateElement('recentHires', data.recentHires || 0);
      
      this.updateStatCardLabel('fullTimeCount', 'Full-Time Users');
      this.updateStatCardLabel('partTimeCount', 'Part-Time Users');
      this.updateStatCardLabel('contractorCount', 'Contractors');
      this.updateStatCardLabel('recentHires', 'New Users (7 days)');
      
    } else {
      // Regular employee statistics
      this.updateElement('totalEmployees', data.totalEmployees || 0);
      this.updateElement('activeEmployees', data.activeEmployees || 0);
      this.updateElement('departments', data.departments || 0);
      this.updateElement('attendanceRate', `${data.attendanceRate || 0}%`);
      
      // Update employment type breakdown
      this.updateElement('fullTimeCount', data.fullTimeCount || 0);
      this.updateElement('partTimeCount', data.partTimeCount || 0);
      this.updateElement('contractorCount', data.contractorCount || 0);
      this.updateElement('recentHires', data.recentHires || 0);
      
      // Standard labels for employees
      this.updateStatCardLabel('totalEmployees', 'Total Employees');
      this.updateStatCardLabel('activeEmployees', 'Active Employees');
      this.updateStatCardLabel('departments', 'Departments');
      this.updateStatCardLabel('attendanceRate', 'Attendance Rate');
      this.updateStatCardLabel('fullTimeCount', 'Full-Time');
      this.updateStatCardLabel('partTimeCount', 'Part-Time');
      this.updateStatCardLabel('contractorCount', 'Contractors');
      this.updateStatCardLabel('recentHires', 'Recent Hires');
    }

    // Animate all stat numbers
    this.animateNumber('totalEmployees', data.totalEmployees || 0);
    this.animateNumber('activeEmployees', data.activeEmployees || 0);
    this.animateNumber('departments', data.departments || 0);
    this.animateNumber('attendanceRate', data.attendanceRate || 0);
    this.animateNumber('fullTimeCount', data.fullTimeCount || 0);
    this.animateNumber('partTimeCount', data.partTimeCount || 0);
    this.animateNumber('contractorCount', data.contractorCount || 0);
    this.animateNumber('recentHires', data.recentHires || 0);
    
    // Animate admin-specific stats if they exist
    if (data.pendingApprovals !== undefined) {
      this.animateNumber('pendingApprovals', data.pendingApprovals || 0);
    }
    if (data.averagePerformance !== undefined) {
      this.animateNumber('averagePerformance', data.averagePerformance || 0);
    }
    if (data.managementEfficiency !== undefined) {
      this.animateNumber('managementEfficiency', data.managementEfficiency || 0);
    }
  }

  animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();
    const isPercentage = elementId === 'attendanceRate';

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (targetValue - startValue) * easeOutQuart;

      if (isPercentage) {
        element.textContent = `${Math.round(currentValue)}%`;
      } else {
        element.textContent = Math.floor(currentValue).toLocaleString();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }



  async initializeCharts() {
    console.log('📊 Initializing enhanced charts...');
    this.createEmployeeGrowthChart();
    this.createDepartmentChart();
    
    // Only create attendance chart for non-super-admin users (employee management)
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    const profileData = profile.profile || profile;
    if (profileData.role !== 'super_admin') {
      await this.createAttendanceChart();
    }
    
    this.createPerformanceChart();
    this.setupChartControls();
  }

  createEmployeeGrowthChart() {
    const ctx = document.getElementById('employeeGrowthChart');
    if (!ctx) {
      console.log('❌ Employee growth chart canvas not found');
      return;
    }

    const data = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
      datasets: [{
        label: 'Total Employees',
        data: [45, 52, 58, 65, 72, 78, 85, 92],
        borderColor: '#4e8cff',
        backgroundColor: 'rgba(78, 140, 255, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4e8cff',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }, {
        label: 'New Hires',
        data: [7, 6, 7, 7, 6, 7, 7, 7],
        borderColor: '#51cf66',
        backgroundColor: 'rgba(81, 207, 102, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#51cf66',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };

    const config = {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              color: '#6b7280',
              font: {
                size: 12
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: '#f3f4f6',
              drawBorder: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    this.charts.growth = new Chart(ctx, config);
    console.log('✅ Employee growth chart created');
  }

  createDepartmentChart() {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) {
      console.log('❌ Department chart canvas not found');
      return;
    }

    const data = {
      labels: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Other'],
      datasets: [{
        data: [32, 24, 20, 11, 8, 5],
        backgroundColor: [
          '#4e8cff',
          '#ff6b6b',
          '#51cf66',
          '#ffd43b',
          '#ae8fff',
          '#ff922b'
        ],
        borderWidth: 0,
        cutout: '60%'
      }]
    };

    const config = {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        cutout: '60%'
      }
    };

    this.charts.department = new Chart(ctx, config);
    console.log('✅ Department chart created');
  }

  async createAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) {
      console.log('❌ Attendance chart canvas not found');
      return;
    }

    // Note: Attendance chart is not shown for super admin users (platform management focus)

    try {
      // Fetch real-time attendance data
      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let attendanceData;
      if (response.ok) {
        const analytics = await response.json();
        attendanceData = analytics.dailyAttendance;
        console.log('📊 Real-time attendance data:', attendanceData);
      } else {
        console.log('⚠️ Using fallback attendance data');
        // Fallback to static data if API fails
        attendanceData = [
          { day: 'Mon', rate: 95.2 },
          { day: 'Tue', rate: 94.8 },
          { day: 'Wed', rate: 96.1 },
          { day: 'Thu', rate: 93.9 },
          { day: 'Fri', rate: 95.5 },
          { day: 'Sat', rate: 92.3 },
          { day: 'Sun', rate: 89.7 }
        ];
      }

      // Update the attendance summary in the HTML
      const attendanceSummary = document.getElementById('attendanceAverage');
      if (attendanceSummary && attendanceData) {
        const averageRate = attendanceData.reduce((sum, day) => sum + day.rate, 0) / attendanceData.length;
        attendanceSummary.textContent = `Avg: ${averageRate.toFixed(1)}%`;
        console.log(`📊 Updated attendance average: ${averageRate.toFixed(1)}%`);
      } else if (attendanceSummary) {
        // Fallback if no data available
        attendanceSummary.textContent = 'Avg: 93.9%';
        console.log('📊 Using fallback attendance average: 93.9%');
    }

    const data = {
        labels: attendanceData.map(day => day.day),
        datasets: [{
          label: 'Attendance Rate',
          data: attendanceData.map(day => day.rate),
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ff6b6b',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      };

      const config = {
        type: 'line',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#6b7280',
                font: {
                  size: 12
                }
              }
            },
            y: {
              grid: {
                color: '#f3f4f6',
                drawBorder: false
              },
              ticks: {
                color: '#6b7280',
                font: {
                  size: 12
                },
                callback: function(value) {
                  return value + '%';
                }
              },
              min: 75,
              max: 100
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      };

      this.charts.attendance = new Chart(ctx, config);
      console.log('✅ Real-time attendance chart created');

    } catch (error) {
      console.error('❌ Error creating attendance chart:', error);
      
      // Ensure average is displayed even on error
      const errorAttendanceSummary = document.getElementById('attendanceAverage');
      if (errorAttendanceSummary) {
        errorAttendanceSummary.textContent = 'Avg: 93.9%';
        console.log('📊 Set fallback attendance average due to error');
      }
      
      // Fallback to static data
      const fallbackData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Attendance Rate',
        data: [95.2, 94.8, 96.1, 93.9, 95.5, 92.3, 89.7],
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#ff6b6b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };

    const config = {
      type: 'line',
        data: fallbackData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: '#f3f4f6',
              drawBorder: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              },
              callback: function(value) {
                return value + '%';
              }
            },
            min: 85,
            max: 100
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    this.charts.attendance = new Chart(ctx, config);
      
      // Update the attendance summary with fallback data
      const fallbackAttendanceSummary = document.getElementById('attendanceAverage');
      if (fallbackAttendanceSummary) {
        const fallbackAverage = (95.2 + 94.8 + 96.1 + 93.9 + 95.5 + 92.3 + 89.7) / 7;
        fallbackAttendanceSummary.textContent = `Avg: ${fallbackAverage.toFixed(1)}%`;
        console.log(`📊 Updated attendance average (fallback): ${fallbackAverage.toFixed(1)}%`);
      }
      
      console.log('✅ Fallback attendance chart created');
    }
  }

  createPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) {
      console.log('❌ Performance chart canvas not found');
      return;
    }

    const data = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Productivity',
        data: [87, 89, 92, 94],
        borderColor: '#51cf66',
        backgroundColor: 'rgba(81, 207, 102, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#51cf66',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };

    const config = {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              }
            }
          },
          y: {
            grid: {
              color: '#f3f4f6',
              drawBorder: false
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 12
              },
              callback: function(value) {
                return value + '%';
              }
            },
            min: 80,
            max: 100
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };

    this.charts.performance = new Chart(ctx, config);
    console.log('✅ Performance chart created');
  }

  setupChartControls() {
    // Department chart view toggle
    const chartBtns = document.querySelectorAll('.chart-btn');
    chartBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        const chartBody = e.target.closest('.chart-container').querySelector('.chart-body');
        const canvas = chartBody.querySelector('canvas');
        const list = chartBody.querySelector('.department-list');
        
        // Update button states
        chartBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Toggle view
        if (view === 'chart') {
          canvas.style.display = 'block';
          list.classList.add('hidden');
        } else {
          canvas.style.display = 'none';
          list.classList.remove('hidden');
        }
      });
    });

    // Growth timeframe selector
    const growthTimeframe = document.getElementById('growthTimeframe');
    if (growthTimeframe) {
      growthTimeframe.addEventListener('change', (e) => {
        console.log('📊 Growth timeframe changed to:', e.target.value);
        // Here you would typically update the chart data based on the selected timeframe
      });
    }

    // Performance metric selector
    const performanceMetric = document.getElementById('performanceMetric');
    if (performanceMetric) {
      performanceMetric.addEventListener('change', (e) => {
        console.log('📊 Performance metric changed to:', e.target.value);
        // Here you would typically update the performance chart data
      });
    }
  }

  updateCharts(data) {
    // Check if chart containers are properly sized before updating
    const growthCanvas = document.getElementById('mainLineChart');
    const roleCanvas = document.getElementById('donutChart');

    if (this.charts.growth && data.growth && growthCanvas) {
      const rect = growthCanvas.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        this.charts.growth.data.datasets[0].data = data.growth;
        this.charts.growth.update('none'); // Use 'none' to prevent animation that might cause expansion

        // Enforce size constraints after update
        setTimeout(() => {
          this.enforceChartSizeConstraints();
        }, 50);
      } else {
        console.log('⚠️ Growth chart container not properly sized, skipping update');
      }
    }

    if (this.charts.role && data.roles && roleCanvas) {
      const rect = roleCanvas.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        this.charts.role.data.datasets[0].data = data.roles;
        this.charts.role.update('none'); // Use 'none' to prevent animation that might cause expansion

        // Enforce size constraints after update
        setTimeout(() => {
          this.enforceChartSizeConstraints();
        }, 50);
      } else {
        console.log('⚠️ Role chart container not properly sized, skipping update');
      }
    }
  }

  updateUserInfo() {
    console.log('🔄 updateUserInfo called');
    console.log('👤 Current user data:', this.currentUser);

    if (!this.currentUser) {
      console.log('❌ No currentUser data available');
      return;
    }

    // Find ALL elements with user classes (multiple locations possible)
    const userNameEls = document.querySelectorAll('.user-name');
    const userRoleEls = document.querySelectorAll('.user-role');
    const userAvatarEls = document.querySelectorAll('.user-avatar');
    const userEmailEls = document.querySelectorAll('.user-email');

    console.log('🔍 DOM elements found:', {
      userNameEls: userNameEls.length,
      userRoleEls: userRoleEls.length,
      userAvatarEls: userAvatarEls.length,
      userEmailEls: userEmailEls.length
    });

    // Update ALL user name elements
    const newName = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
    userNameEls.forEach((el, index) => {
      console.log(`📝 Updating user name element ${index + 1} to:`, newName);
      el.textContent = newName;
    });

    // Update ALL user role elements
    const newRole = this.formatRole(this.currentUser.role);
    userRoleEls.forEach((el, index) => {
      console.log(`🎭 Updating user role element ${index + 1} to:`, newRole);
      el.textContent = newRole;
    });

    // Update ALL user email elements
    const userEmail = this.currentUser.email;
    userEmailEls.forEach((el, index) => {
      console.log(`📧 Updating user email element ${index + 1} to:`, userEmail);
      el.textContent = userEmail;
    });

    // Update ALL user avatar elements
    const initials = `${this.currentUser.first_name.charAt(0)}${this.currentUser.last_name.charAt(0)}`.toUpperCase();
    const avatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=4e8cff&color=fff&size=48`;
    userAvatarEls.forEach((el, index) => {
      console.log(`🖼️ Updating user avatar element ${index + 1} to:`, avatarUrl);
      if (el.tagName === 'IMG') {
        el.src = avatarUrl;
      } else {
        el.textContent = initials;
      }
    });

    console.log('✅ User info update completed');
  }

  formatRole(role) {
    const roleMap = {
      'super_admin': 'Super Admin',
      'admin': 'Administrator',
      'manager': 'Manager',
      'organization_member': 'Member'
    };
    return roleMap[role] || role;
  }

  updateActivity(activities) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList || !activities) return;

    if (activities.length === 0) {
      activityList.innerHTML = `
                <li class="activity-item">
                    <div style="text-align: center; color: #b0b8c9; padding: 20px;">
                        No recent activity
                    </div>
                </li>
            `;
      return;
    }

    activityList.innerHTML = activities.map(activity => {
      // Extract name from message if it contains HTML
      const nameMatch = activity.message.match(/<strong>(.*?)<\/strong>/);
      const name = nameMatch ? nameMatch[1] : 'Employee';

      // Generate random avatar
      const avatarId = Math.floor(Math.random() * 50) + 1;
      const gender = Math.random() > 0.5 ? 'men' : 'women';

      return `
                <li class="activity-item">
                    <img src="https://randomuser.me/api/portraits/${gender}/${avatarId}.jpg" class="activity-avatar" />
                    <div>
                        <div class="activity-name">${name}</div>
                        <div class="activity-meta">${this.timeAgo(activity.created_at)} &bull; ${this.getActivityDescription(activity.type)}</div>
                    </div>
                    <div class="activity-trend up">${this.getActivityStatus(activity.type)}</div>
                </li>
            `;
    }).join('');
  }

  getActivityDescription(type) {
    const descriptions = {
      'user_joined': 'Joined organization',
      'profile_updated': 'Updated profile',
      'timesheet_updated': 'Time tracking',
      'org_updated': 'Organization updated'
    };
    return descriptions[type] || 'Activity';
  }

  getActivityStatus(type) {
    const statuses = {
      'user_joined': 'New',
      'profile_updated': 'Updated',
      'timesheet_updated': 'On Time',
      'org_updated': 'Updated'
    };
    return statuses[type] || 'Activity';
  }

  timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  showToast(message, type = 'info') {
    // Block organization-related messages for super admin
    if (message && message.toLowerCase().includes('organization')) {
      try {
        const cachedProfile = localStorage.getItem('profile');
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          const profileData = parsed.profile || parsed;
          if (profileData.role === 'super_admin') {
            console.log('👑 BLOCKED organization toast for super admin:', message);
            return; // Don't show toast
          }
        }
      } catch (e) {
        console.log('⚠️ Error checking profile in showToast');
      }
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  getActivityIcon(type) {
    const icons = {
      'user_joined': 'fas fa-user-plus',
      'profile_updated': 'fas fa-user-edit',
      'org_updated': 'fas fa-building',
      'role_changed': 'fas fa-user-shield',
      'login': 'fas fa-sign-in-alt'
    };
    return icons[type] || 'fas fa-info-circle';
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');

    // Sidebar toggle - now using the user icon
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    console.log('Sidebar toggle element:', sidebarToggle);
    console.log('Sidebar element:', sidebar);

    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        console.log('🎯 Sidebar toggle clicked!');
        e.preventDefault();
        this.toggleSidebar();
      });
      console.log('✅ Sidebar toggle event listener added');
    } else {
      console.error('❌ Sidebar elements not found');
    }

    // Add debug listener for Organizations sidebar link
    const orgSidebarLink = document.getElementById('organizationsSidebarLink');
    if (orgSidebarLink) {
      console.log('🔍 Found Organizations sidebar link, adding debug listener');
      orgSidebarLink.addEventListener('click', (e) => {
        console.log('🔍 Organizations sidebar link clicked');
        console.log('🔍 Link href:', orgSidebarLink.getAttribute('href'));
        console.log('🔍 Current URL before navigation:', window.location.href);
      });
    } else {
      console.log('❌ Organizations sidebar link not found');
    }

    // Chart period controls
    const periodButtons = document.querySelectorAll('.chart-period');
    periodButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        periodButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentPeriod = e.target.dataset.period;
        this.updateChartPeriod();
      });
    });

    // Quick action buttons
    const actionButtons = {
      'inviteEmployee': () => this.handleInviteEmployee(),
      'viewReports': () => this.handleViewReports(),
      'manageOrg': () => this.handleManageOrg(),
      'exportData': () => this.handleExportData()
    };

    Object.entries(actionButtons).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    // Organization creation form
    const createOrgForm = document.getElementById('createOrgForm');
    if (createOrgForm) {
      createOrgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateOrganization();
      });
    }

    // Invite generation form
    const generateInviteForm = document.getElementById('generateInviteForm');
    if (generateInviteForm) {
      generateInviteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGenerateInvite();
      });
    }

    // Copy invite link button
    const copyInviteLink = document.getElementById('copyInviteLink');
    if (copyInviteLink) {
      copyInviteLink.addEventListener('click', () => this.handleCopyInviteLink());
    }

    // Organization button
    const organizationBtn = document.getElementById('organizationBtn');
    if (organizationBtn) {
      console.log('🔍 Found organization button, adding click listener');
      organizationBtn.addEventListener('click', (e) => {
        console.log('🔍 Organization button clicked');
        e.preventDefault();
        console.log('🔍 Default prevented, about to call showOrganizationSection()');
        this.showOrganizationSection();
        console.log('🔍 showOrganizationSection() called');
      });
    } else {
      console.log('❌ Organization button not found');
    }

    // Organization creation form
    const newOrgForm = document.getElementById('newOrgForm');
    if (newOrgForm) {
      newOrgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateNewOrganization();
      });
    }

    // Create organization button
    const createOrgBtn = document.getElementById('createOrgBtn');
    if (createOrgBtn) {
      createOrgBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showCreateOrganizationForm();
      });
    }

    // Cancel create organization button
    const cancelCreateOrg = document.getElementById('cancelCreateOrg');
    if (cancelCreateOrg) {
      cancelCreateOrg.addEventListener('click', (e) => {
        e.preventDefault();
        this.showNoOrganizationState();
      });
    }

    // Edit organization button
    const editOrgBtn = document.getElementById('editOrgBtn');
    if (editOrgBtn) {
      editOrgBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showToast('Edit organization feature coming soon!', 'info');
      });
    }

    // Regenerate join code button
    const regenerateJoinCodeBtn = document.getElementById('regenerateJoinCodeBtn');
    if (regenerateJoinCodeBtn) {
      regenerateJoinCodeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleRegenerateJoinCode();
      });
    }
  }

  async updateChartPeriod() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/charts?period=${this.currentPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      this.updateCharts(data);
    } catch (error) {
      console.error('Failed to update chart period:', error);
    }
  }

  async handleCreateOrganization() {
    try {
      const name = document.getElementById('orgName').value;
      const description = document.getElementById('orgDescription').value;

      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/create-organization', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      this.showToast('Organization created successfully!', 'success');

      // Update current user with organization_id
      this.currentUser.organization_id = data.organization.id;

      // Show invite section
      this.showInviteSection();

    } catch (error) {
      console.error('Create organization error:', error);
      this.showToast(error.message, 'error');
    }
  }

  async loadOrganizationData() {
    console.log('🔍 loadOrganizationData called');
    console.log('🔍 Current URL before fetch:', window.location.href);
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Token exists:', !!token);

      if (!token) {
        console.log('❌ No token found, showing no organization state instead of redirecting');
        this.showNoOrganizationState();
        return;
      }

      console.log('🔍 Current user:', this.currentUser);

      // If currentUser is null, try to fetch it first
      if (!this.currentUser) {
        console.log('🔍 Current user is null, attempting to fetch user data');
        try {
          const userResponse = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (userResponse.ok) {
            const userData = await userResponse.json();
            this.currentUser = userData.profile;
            console.log('✅ Successfully fetched user data:', this.currentUser);
          } else {
            console.log('❌ Failed to fetch user data, status:', userResponse.status);
            this.showNoOrganizationState();
            return;
          }
        } catch (userError) {
          console.error('❌ Error fetching user data:', userError);
          this.showNoOrganizationState();
          return;
        }
      }

      if (!this.currentUser || !this.currentUser.organization_id) {
        console.log('🔍 No organization ID found, showing no organization state');
        this.showNoOrganizationState();
        return;
      }

      console.log('🔍 About to fetch organization data from /api/organizations/' + this.currentUser.organization_id);
      // Load organization details
      const response = await fetch(`/api/organizations/${this.currentUser.organization_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('🔍 Response status:', response.status);

      if (response.ok) {
        const organization = await response.json();
        console.log('🔍 Organization data received:', organization);
        this.showOrganizationDetails(organization);
      } else {
        console.log('🔍 Response not OK, showing no organization state');
        this.showNoOrganizationState();
      }
      console.log('🔍 Current URL after fetch:', window.location.href);

    } catch (error) {
      console.error('❌ Failed to load organization data:', error);
      this.showNoOrganizationState();
    }
  }

  showNoOrganizationState() {
    document.getElementById('noOrgState').classList.remove('hidden');
    document.getElementById('createOrgForm').classList.add('hidden');
    document.getElementById('orgDetails').classList.add('hidden');
    document.getElementById('orgStatusText').textContent = 'Create your organization to get started';
  }

  showCreateOrganizationForm() {
    document.getElementById('noOrgState').classList.add('hidden');
    document.getElementById('createOrgForm').classList.remove('hidden');
    document.getElementById('orgDetails').classList.add('hidden');
    document.getElementById('orgStatusText').textContent = 'Create a new organization';
  }

  showOrganizationDetails(organization) {
    document.getElementById('noOrgState').classList.add('hidden');
    document.getElementById('createOrgForm').classList.add('hidden');
    document.getElementById('orgDetails').classList.remove('hidden');
    document.getElementById('orgStatusText').textContent = 'Manage your organization settings';

    // Update organization details
    document.getElementById('orgNameDisplay').textContent = organization.name;
    document.getElementById('orgDescriptionDisplay').textContent = organization.description || 'No description provided';
    document.getElementById('orgJoinCode').textContent = organization.join_code || 'N/A';
    document.getElementById('orgCreatedDate').textContent = new Date(organization.created_at).toLocaleDateString();

    // Load member count
    this.loadOrganizationMembers();
  }

  async loadOrganizationMembers() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/${this.currentUser.organization_id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        document.getElementById('orgMemberCount').textContent = data.members.length;
      }
    } catch (error) {
      console.error('Failed to load organization members:', error);
      document.getElementById('orgMemberCount').textContent = '0';
    }
  }

  async handleCreateNewOrganization() {
    const form = document.getElementById('newOrgForm');
    const formData = new FormData(form);

    const orgData = {
      name: formData.get('orgName'),
      description: formData.get('orgDescription') || '',
      industry: formData.get('orgIndustry') || '',
      size: formData.get('orgSize') || '',
      website: formData.get('orgWebsite') || '',
      address: formData.get('orgAddress') || ''
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orgData)
      });

      if (!response.ok) {
        throw new Error('Failed to create organization');
      }

      const result = await response.json();
      this.showToast('Organization created successfully!', 'success');

      // Refresh user data to get the new organization_id
      const userResponse = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        this.currentUser = userData.profile;
        localStorage.setItem('user', JSON.stringify(userData.profile));
      }
      this.loadOrganizationData();

    } catch (error) {
      console.error('Create organization error:', error);
      this.showToast('Failed to create organization', 'error');
    }
  }

  async handleRegenerateJoinCode() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizations/${this.currentUser.organization_id}/regenerate-join-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate join code');
      }

      const result = await response.json();
      document.getElementById('orgJoinCode').textContent = result.organization.join_code;
      this.showToast('Join code regenerated successfully!', 'success');

    } catch (error) {
      console.error('Regenerate join code error:', error);
      this.showToast('Failed to regenerate join code', 'error');
    }
  }

  async handleGenerateInvite() {
    try {
      const firstName = document.getElementById('inviteFirstName').value;
      const lastName = document.getElementById('inviteLastName').value;
      const email = document.getElementById('inviteEmail').value;

      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/generate-invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite');
      }

      // Show invite result
      document.getElementById('inviteLink').value = data.invite.invite_link;
      document.getElementById('inviteResult').classList.remove('hidden');

      // Reset form
      document.getElementById('generateInviteForm').reset();

      this.showToast('Invite generated successfully!', 'success');

    } catch (error) {
      console.error('Generate invite error:', error);
      this.showToast(error.message, 'error');
    }
  }

  handleCopyInviteLink() {
    const inviteLink = document.getElementById('inviteLink');
    inviteLink.select();
    document.execCommand('copy');
    this.showToast('Invite link copied to clipboard!', 'success');
  }

  handleInviteEmployee() {
    this.showInviteSection();
  }

  handleViewReports() {
    this.showToast('Reports page coming soon!', 'info');
    // TODO: Navigate to reports page
  }

  handleManageOrg() {
    window.location.href = '/organizations';
  }

  async handleExportData() {
    try {
      this.showToast('Preparing export...', 'info');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (data.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `employee-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Export completed successfully!', 'success');
      }
    } catch (error) {
      console.error('Export failed:', error);
      this.showToast('Export failed. Please try again.', 'error');
    }
  }

  async handleLogout() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      this.showToast('Logged out successfully', 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  }

  toggleSidebar() {
    console.log('🔄 Toggling sidebar...');
    const sidebar = document.getElementById('sidebar');
    const isExpanded = sidebar.classList.contains('expanded');

    console.log('Current sidebar state - expanded:', isExpanded);

    if (isExpanded) {
      sidebar.classList.remove('expanded');
      sidebar.classList.add('collapsed');
      localStorage.setItem('sidebarState', 'collapsed');
      console.log('✅ Sidebar collapsed');
    } else {
      sidebar.classList.remove('collapsed');
      sidebar.classList.add('expanded');
      localStorage.setItem('sidebarState', 'expanded');
      console.log('✅ Sidebar expanded');
    }

    // Trigger resize event to update charts
    setTimeout(() => {
      this.handleResize();
    }, 300);
  }

  resetSidebarState() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      // Remove any existing state classes
      sidebar.classList.remove('expanded', 'collapsed');
    }
  }

  loadSidebarState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    // Always start expanded on every page load
    sidebar.classList.remove('collapsed');
    sidebar.classList.add('expanded');
    localStorage.setItem('sidebarState', 'expanded');
  }

  startDataRefresh() {
    // Refresh dashboard data every 5 minutes
    setInterval(() => {
      this.loadDashboardData();
    }, 5 * 60 * 1000);
  }

  startSuperAdminDataRefresh() {
    // Refresh super admin data every 2 minutes for more real-time updates
    setInterval(() => {
      console.log('🔄 Refreshing super admin data...');
      this.loadWebsiteStats();
      this.loadWebsiteCharts();
      this.loadWebsiteActivity();
      // Note: Attendance data refresh removed - not relevant for super admin (platform management)
    }, 2 * 60 * 1000);
  }

  // Note: refreshAttendanceData() removed - not relevant for super admin role

  // Utility method to refresh charts on window resize
  handleResize() {
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.resize) {
        chart.resize();
      }
    });
  }

  // Method to destroy charts to prevent memory leaks
  destroyCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  // Method to reinitialize charts if they get corrupted
  async reinitializeCharts() {
    console.log('🔄 Reinitializing charts...');
    this.destroyCharts();
    setTimeout(async () => {
      await this.initializeCharts();
    }, 100);
  }

  // Method to force chart size constraints
  enforceChartSizeConstraints() {
    const growthCanvas = document.getElementById('mainLineChart');
    const roleCanvas = document.getElementById('donutChart');
    const attendanceCanvas = document.getElementById('weeklyBarChart');

    if (growthCanvas) {
      // Force canvas size with !important equivalent
      growthCanvas.style.setProperty('height', '150px', 'important');
      growthCanvas.style.setProperty('max-height', '150px', 'important');
      growthCanvas.style.setProperty('min-height', '150px', 'important');
      growthCanvas.height = 150;
      growthCanvas.width = growthCanvas.offsetWidth;

      // Force parent container size
      const parent = growthCanvas.closest('.chart-card');
      if (parent) {
        parent.style.setProperty('height', '200px', 'important');
        parent.style.setProperty('max-height', '200px', 'important');
        parent.style.setProperty('min-height', '200px', 'important');
        parent.style.setProperty('overflow', 'hidden', 'important');
      }
    }

    if (roleCanvas) {
      // Force canvas size with !important equivalent
      roleCanvas.style.setProperty('height', '120px', 'important');
      roleCanvas.style.setProperty('max-height', '120px', 'important');
      roleCanvas.style.setProperty('min-height', '120px', 'important');
      roleCanvas.height = 120;
      roleCanvas.width = roleCanvas.offsetWidth;

      // Force parent container size
      const parent = roleCanvas.closest('.donut-card');
      if (parent) {
        parent.style.setProperty('height', '180px', 'important');
        parent.style.setProperty('max-height', '180px', 'important');
        parent.style.setProperty('min-height', '180px', 'important');
        parent.style.setProperty('overflow', 'hidden', 'important');
      }
    }

    if (attendanceCanvas) {
      // Force canvas size with !important equivalent
      attendanceCanvas.style.setProperty('height', '60px', 'important');
      attendanceCanvas.style.setProperty('max-height', '60px', 'important');
      attendanceCanvas.style.setProperty('min-height', '60px', 'important');
      attendanceCanvas.height = 60;
      attendanceCanvas.width = attendanceCanvas.offsetWidth;

      // Force parent container size
      const parent = attendanceCanvas.closest('.attendance-card');
      if (parent) {
        parent.style.setProperty('height', '120px', 'important');
        parent.style.setProperty('max-height', '120px', 'important');
        parent.style.setProperty('min-height', '120px', 'important');
        parent.style.setProperty('overflow', 'hidden', 'important');
      }
    }

    // Additional global container enforcement
    const chartCard = document.querySelector('.chart-card');
    const donutCard = document.querySelector('.donut-card');
    const attendanceCard = document.querySelector('.attendance-card');

    if (chartCard) {
      chartCard.style.setProperty('height', '200px', 'important');
      chartCard.style.setProperty('max-height', '200px', 'important');
      chartCard.style.setProperty('min-height', '200px', 'important');
      chartCard.style.setProperty('overflow', 'hidden', 'important');
    }

    if (donutCard) {
      donutCard.style.setProperty('height', '180px', 'important');
      donutCard.style.setProperty('max-height', '180px', 'important');
      donutCard.style.setProperty('min-height', '180px', 'important');
      donutCard.style.setProperty('overflow', 'hidden', 'important');
    }

    if (attendanceCard) {
      attendanceCard.style.setProperty('height', '120px', 'important');
      attendanceCard.style.setProperty('max-height', '120px', 'important');
      attendanceCard.style.setProperty('min-height', '120px', 'important');
      attendanceCard.style.setProperty('overflow', 'hidden', 'important');
    }
  }

  // Set up resize observer to prevent chart expansion
  setupChartSizeObserver() {
    const growthCanvas = document.getElementById('mainLineChart');
    const roleCanvas = document.getElementById('donutChart');
    const attendanceCanvas = document.getElementById('weeklyBarChart');

    if (growthCanvas) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.height > 150) {
            console.log('🚫 Preventing chart expansion - forcing height to 150px');
            entry.target.style.setProperty('height', '150px', 'important');
            entry.target.style.setProperty('max-height', '150px', 'important');
            entry.target.style.setProperty('min-height', '150px', 'important');
            entry.target.height = 150;
            if (this.charts.growth) {
              this.charts.growth.resize();
            }
            // Force immediate re-enforcement
            setTimeout(() => this.enforceChartSizeConstraints(), 10);
          }
        }
      });
      observer.observe(growthCanvas);
    }

    if (roleCanvas) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.height > 120) {
            console.log('🚫 Preventing donut chart expansion - forcing height to 120px');
            entry.target.style.setProperty('height', '120px', 'important');
            entry.target.style.setProperty('max-height', '120px', 'important');
            entry.target.style.setProperty('min-height', '120px', 'important');
            entry.target.height = 120;
            if (this.charts.role) {
              this.charts.role.resize();
            }
            // Force immediate re-enforcement
            setTimeout(() => this.enforceChartSizeConstraints(), 10);
          }
        }
      });
      observer.observe(roleCanvas);
    }

    if (attendanceCanvas) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.height > 60) {
            console.log('🚫 Preventing attendance chart expansion - forcing height to 60px');
            entry.target.style.setProperty('height', '60px', 'important');
            entry.target.style.setProperty('max-height', '60px', 'important');
            entry.target.style.setProperty('min-height', '60px', 'important');
            entry.target.height = 60;
            // Force immediate re-enforcement
            setTimeout(() => this.enforceChartSizeConstraints(), 10);
          }
        }
      });
      observer.observe(attendanceCanvas);
    }

    // Also observe the chart containers themselves
    const chartCard = document.querySelector('.chart-card');
    const donutCard = document.querySelector('.donut-card');
    const attendanceCard = document.querySelector('.attendance-card');

    if (chartCard) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.height > 200) {
            console.log('🚫 Preventing chart card expansion - forcing height to 200px');
            entry.target.style.setProperty('height', '200px', 'important');
            entry.target.style.setProperty('max-height', '200px', 'important');
            entry.target.style.setProperty('min-height', '200px', 'important');
            entry.target.style.setProperty('overflow', 'hidden', 'important');
            setTimeout(() => this.enforceChartSizeConstraints(), 10);
          }
        }
      });
      observer.observe(chartCard);
    }

    if (donutCard) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.height > 180) {
            console.log('🚫 Preventing donut card expansion - forcing height to 180px');
            entry.target.style.setProperty('height', '180px', 'important');
            entry.target.style.setProperty('max-height', '180px', 'important');
            entry.target.style.setProperty('min-height', '180px', 'important');
            entry.target.style.setProperty('overflow', 'hidden', 'important');
            setTimeout(() => this.enforceChartSizeConstraints(), 10);
          }
        }
      });
      observer.observe(donutCard);
    }

    if (attendanceCard) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          if (entry.contentRect.height > 120) {
            console.log('🚫 Preventing attendance card expansion - forcing height to 120px');
            entry.target.style.setProperty('height', '120px', 'important');
            entry.target.style.setProperty('max-height', '120px', 'important');
            entry.target.style.setProperty('min-height', '120px', 'important');
            entry.target.style.setProperty('overflow', 'hidden', 'important');
            setTimeout(() => this.enforceChartSizeConstraints(), 10);
          }
        }
      });
      observer.observe(attendanceCard);
    }
  }

  // Set up mutation observer to catch any DOM changes that might affect chart sizes
  setupMutationObserver() {
    const dashboardContent = document.querySelector('.dashboard-content');
    if (dashboardContent) {
      const observer = new MutationObserver((mutations) => {
        let shouldEnforce = false;

        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            // Check if any chart-related elements were modified
            const target = mutation.target;
            if (target && (
              target.classList.contains('chart-card') ||
              target.classList.contains('donut-card') ||
              target.classList.contains('attendance-card') ||
              target.id === 'mainLineChart' ||
              target.id === 'donutChart' ||
              target.id === 'weeklyBarChart'
            )) {
              shouldEnforce = true;
            }

            // Check if any added nodes are chart-related
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList && (
                  node.classList.contains('chart-card') ||
                  node.classList.contains('donut-card') ||
                  node.classList.contains('attendance-card')
                )) {
                  shouldEnforce = true;
                }
              }
            });
          }
        });

        if (shouldEnforce) {
          console.log('🔍 DOM mutation detected - enforcing chart size constraints');
          setTimeout(() => this.enforceChartSizeConstraints(), 50);
        }
      });

      observer.observe(dashboardContent, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  }

  // Continuous monitoring to prevent expansion
  startChartSizeMonitoring() {
    // Check every 100ms for immediate response
    setInterval(() => {
      this.enforceChartSizeConstraints();
    }, 100);

    // Also check every 500ms for additional safety
    setInterval(() => {
      this.enforceChartSizeConstraints();
    }, 500);

    // And every second for comprehensive monitoring
    setInterval(() => {
      this.enforceChartSizeConstraints();
    }, 1000);

    // Force initial constraints
    setTimeout(() => {
      this.enforceChartSizeConstraints();
    }, 100);

    setTimeout(() => {
      this.enforceChartSizeConstraints();
    }, 500);

    setTimeout(() => {
      this.enforceChartSizeConstraints();
    }, 1000);
  }

  updateNavigationVisibilityDirectly(profileData) {
    console.log('🔧 Updating navigation visibility directly for role:', profileData.role);

    // Get all navigation items
    const dashboardNav = document.querySelector('a[href="/dashboard"]');
    const analyticsNav = document.querySelector('a[href="/analytics"]');
    const usersNav = document.querySelector('a[href="/users"]');
    const payrollNav = document.querySelector('a[href="/payroll"]');
    const organizationsNav = document.querySelector('a[href="/organizations"]');
    const settingsNav = document.querySelector('a[href="/settings"]');
    const subscriptionNav = document.querySelector('a[href="/subscription-settings"]');

    // Hide all navigation items first
    [dashboardNav, analyticsNav, usersNav, payrollNav, organizationsNav, settingsNav, subscriptionNav].forEach(nav => {
      if (nav) {
        nav.style.display = 'none';
        nav.style.visibility = 'hidden';
        nav.style.opacity = '0';
      }
    });

    if (profileData.role === 'super_admin') {
      // Super Admin sees: Dashboard, Analytics, User Management, Settings (NO SUBSCRIPTION)
      [dashboardNav, analyticsNav, settingsNav].forEach(nav => {
        if (nav) {
          nav.style.display = 'flex';
          nav.style.visibility = 'visible';
          nav.style.opacity = '1';
        }
      });
      
      // Show User Management for super admin
      if (usersNav) {
        usersNav.style.display = 'flex';
        usersNav.style.visibility = 'visible';
        usersNav.style.opacity = '1';
        console.log('✅ User Management shown for super admin (direct)');
      }
      
      // Hide Subscription for super admin
      if (subscriptionNav) {
        subscriptionNav.style.display = 'none';
        subscriptionNav.style.visibility = 'hidden';
        subscriptionNav.style.opacity = '0';
        console.log('❌ Subscription hidden for super admin');
      }
      
      console.log('✅ Super Admin navigation: Dashboard, Analytics, User Management, Settings');
    } else {
      // Admin/Manager/Employee sees: Dashboard, Analytics, Payroll, Organizations, Settings, Subscription
      [dashboardNav, analyticsNav, payrollNav, organizationsNav, settingsNav, subscriptionNav].forEach(nav => {
        if (nav) {
          nav.style.display = 'flex';
          nav.style.visibility = 'visible';
          nav.style.opacity = '1';
        }
      });
      
      // Ensure User Management stays hidden for non-super admin
      if (usersNav) {
        usersNav.style.display = 'none';
        usersNav.style.visibility = 'hidden';
        usersNav.style.opacity = '0';
        console.log('❌ User Management hidden for role:', profileData.role);
      }
      
      console.log('✅ Standard navigation: Dashboard, Analytics, Payroll, Organizations, Settings, Subscription');
    }

    console.log('✅ Navigation visibility updated directly');
  }

  updateElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  updateStatCardLabel(elementId, label) {
    // Find the stat card containing the element and update its label
    const element = document.getElementById(elementId);
    if (element) {
      const statCard = element.closest('.stat-card');
      if (statCard) {
        const labelElement = statCard.querySelector('.stat-label');
        if (labelElement) {
          labelElement.textContent = label;
        }
      }
    }
  }
}

// Initialize sidebar immediately when script loads
(function () {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('expanded', 'collapsed');
    sidebar.classList.add('collapsed');
    localStorage.setItem('sidebarState', 'collapsed');
  }
})();

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardInstance = new Dashboard();

  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.dashboardInstance) {
      window.dashboardInstance.handleResize();
    }
  });

  // Fallback sidebar toggle - ensure it works even if main initialization fails
  setTimeout(() => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebar && sidebarToggle && !window.dashboardInstance) {
      console.log('🔄 Setting up fallback sidebar toggle...');
      sidebarToggle.addEventListener('click', (e) => {
        console.log('🎯 Fallback sidebar toggle clicked!');
        e.preventDefault();

        const isExpanded = sidebar.classList.contains('expanded');
        console.log('Current sidebar state - expanded:', isExpanded);

        if (isExpanded) {
          sidebar.classList.remove('expanded');
          sidebar.classList.add('collapsed');
          console.log('✅ Sidebar collapsed (fallback)');
        } else {
          sidebar.classList.remove('collapsed');
          sidebar.classList.add('expanded');
          console.log('✅ Sidebar expanded (fallback)');
        }
      });
      console.log('✅ Fallback sidebar toggle setup complete');
    }
  }, 1000);
});

// Handle page visibility changes (when navigating back/forward)
document.addEventListener('visibilitychange', () => {
  if (window.dashboardInstance && !document.hidden) {
    // Reset and reload sidebar state when page becomes visible
    window.dashboardInstance.resetSidebarState();
    window.dashboardInstance.loadSidebarState();
  }
});

// Handle page load events
window.addEventListener('load', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('expanded', 'collapsed');
    sidebar.classList.add('collapsed');
    localStorage.setItem('sidebarState', 'collapsed');
  }
});

// Store dashboard instance globally for resize handling
window.addEventListener('load', () => {
  if (window.dashboardInstance) {
    window.dashboardInstance.handleResize();
  }
});

// Standalone sidebar toggle - works independently of Dashboard class
(function () {
  function setupStandaloneSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (sidebar && sidebarToggle) {
      console.log('🔄 Setting up standalone sidebar toggle...');

      // Remove any existing event listeners by cloning the element
      const newToggle = sidebarToggle.cloneNode(true);
      sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);

      newToggle.addEventListener('click', function (e) {
        console.log('🎯 Standalone sidebar toggle clicked!');
        e.preventDefault();
        e.stopPropagation();

        const isExpanded = sidebar.classList.contains('expanded');
        console.log('Current sidebar state - expanded:', isExpanded);

        if (isExpanded) {
          sidebar.classList.remove('expanded');
          sidebar.classList.add('collapsed');
          console.log('✅ Sidebar collapsed (standalone)');
        } else {
          sidebar.classList.remove('collapsed');
          sidebar.classList.add('expanded');
          console.log('✅ Sidebar expanded (standalone)');
        }
      });

      console.log('✅ Standalone sidebar toggle setup complete');
    }
  }

  // Setup immediately
  setupStandaloneSidebarToggle();

  // Also setup after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStandaloneSidebarToggle);
  }

  // And after window load
  window.addEventListener('load', setupStandaloneSidebarToggle);
})();
