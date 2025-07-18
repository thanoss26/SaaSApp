

// Shared JavaScript for EmployeeHub
class EmployeeHub {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isRedirecting = false;
        this.isInitialized = false;
        this.isCheckingAuth = false;
        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing EmployeeHub...');
        
        // Clear URL parameters first
        this.clearUrlParameters();
        
        // TEMPORARILY DISABLED: Immediately hide all navigation items to prevent wrong buttons from showing
        // this.injectNavigationCSS();
        
        // Check organization requirement immediately to prevent flickering
        this.checkOrganizationRequirement();
        
        // Setup event listeners
        this.setupEventListeners();
        this.setupNavigationActiveState();
        
        // Start date/time updates
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        
        // Check authentication
        await this.checkAuth();
        
        console.log('✅ EmployeeHub initialized');
    }

    async checkAuth() {
        if (this.isCheckingAuth) return;
        this.isCheckingAuth = true;
        
        try {
            const token = localStorage.getItem('token');
            
            if (token) {
                console.log('🔍 Token found, verifying with server...');
                
                try {
                    const response = await fetch('/api/auth/profile', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Token valid, user authenticated');
                        
                        // Extract profile data (handle nested structure)
                        this.currentUser = data.profile || data;
                        console.log('👤 User profile loaded:', this.currentUser);
                        
                        // Update user info in the UI
                        this.updateUserInfo();
                        
                        // Update navigation based on role
                        this.updateNavigationVisibility();
                        
                        // Now that we have user data, re-check organization requirement
                        // This will either show content or organization requirement
                        this.checkOrganizationRequirement();
                        
                        return;
                    } else {
                        console.log('❌ Token invalid');
                        localStorage.removeItem('token');
                        this.currentUser = null;
                    }
                } catch (error) {
                    console.error('❌ Auth check failed:', error);
                    localStorage.removeItem('token');
                    this.currentUser = null;
                }
            } else {
                console.log('❌ No token found');
                this.currentUser = null;
            }
            
            // If we get here, user is not authenticated
            // Check if we're on a protected page
            const currentPath = window.location.pathname;
            const protectedPages = ['/dashboard', '/analytics', '/users', '/settings', '/payroll', '/organizations'];
            
            if (protectedPages.some(page => currentPath.includes(page))) {
                console.log('🔒 Protected page, redirecting to login');
                window.location.href = '/login';
                return;
            }
            
        } finally {
            this.isCheckingAuth = false;
        }
    }

    checkCurrentPageAccess() {
        if (!this.currentUser) {
            console.log('❌ No user data available for page access check');
            return;
        }

        console.log('🔍 Checking current page access for:', window.location.pathname);

        // Super admin always has access to all pages
        if (this.currentUser.role === 'super_admin') {
            console.log('✅ Super admin detected - full page access granted');
            return;
        }

        // Pages that require organization for admin and below
        const restrictedPages = ['/dashboard', '/analytics', '/payroll', '/organizations'];
        const currentPage = window.location.pathname;

        if (restrictedPages.includes(currentPage)) {
            // Check if user has organization
            if (!this.currentUser.organization_id) {
                console.log('❌ Organization required for page:', currentPage);
                this.showOrganizationRequirement();
                return;
            } else {
                console.log('✅ Organization check passed for page:', currentPage);
                this.hideOrganizationRequirement();
            }
        } else {
            // Pages like /users and /settings don't require organization
            console.log('✅ Page does not require organization:', currentPage);
            this.hideOrganizationRequirement();
        }
    }

    hideOrganizationRequirement() {
        console.log('✅ Hiding organization requirement screen');
        const orgRequiredSection = document.getElementById('organizationRequired');
        
        if (orgRequiredSection) {
            orgRequiredSection.style.display = 'none';
        }
        
        // Show main content areas
        const mainContent = document.getElementById('mainContent');
        const appContainer = document.querySelector('.app-container');
        const dashboardContent = document.querySelector('.dashboard-main');
        const analyticsContent = document.querySelector('.analytics-main');
        const usersContent = document.querySelector('.users-main');
        const payrollContent = document.querySelector('.payroll-main');
        const organizationsContent = document.querySelector('.organizations-main');
        const settingsContent = document.querySelector('.settings-main');
        
        // Show all main content areas
        [mainContent, appContainer, dashboardContent, analyticsContent, 
         usersContent, payrollContent, organizationsContent, settingsContent].forEach(element => {
            if (element) {
                element.style.display = 'block';
            }
        });
    }

    showOrganizationRequirement() {
        console.log('🚫 Showing organization required screen');
        
        // Remove loading state
        const loadingState = document.getElementById('orgLoadingState');
        if (loadingState) {
            loadingState.remove();
        }
        
        // Hide all main content areas
        this.hideMainContentImmediately();
        
        // Show or create organization requirement section
        let orgRequiredSection = document.getElementById('organizationRequired');
        
        if (!orgRequiredSection) {
            // Create the organization requirement section
            orgRequiredSection = document.createElement('div');
            orgRequiredSection.id = 'organizationRequired';
            orgRequiredSection.className = 'org-required-section';
            orgRequiredSection.innerHTML = `
                <div class="org-required-container">
                    <div class="org-required-content">
                        <div class="org-required-icon">
                            <i class="fas fa-building"></i>
                        </div>
                        <h2>Organization Required</h2>
                        <p>You need to create an organization in order to view this page.</p>
                        <div class="org-required-actions">
                            <a href="/organizations" class="btn-primary">
                                <i class="fas fa-plus"></i>
                                Create Organization
                            </a>
                            <button onclick="logout()" class="btn-secondary">
                                <i class="fas fa-sign-out-alt"></i>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add CSS for organization requirement
            if (!document.getElementById('orgRequiredStyles')) {
                const style = document.createElement('style');
                style.id = 'orgRequiredStyles';
                style.textContent = `
                    .org-required-section {
                        position: fixed;
                        top: 0;
                        left: 272px; /* Account for sidebar width */
                        width: calc(100% - 272px);
                        height: 100vh;
                        background: #f8fafc;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        font-family: 'Inter', sans-serif;
                        transition: left 0.3s ease, width 0.3s ease;
                    }
                    
                    /* Adjust for collapsed sidebar */
                    .enhanced-sidebar.collapsed ~ * .org-required-section {
                        left: 70px;
                        width: calc(100% - 70px);
                    }
                    
                    .org-required-container {
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 48px;
                        text-align: center;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                        border: 1px solid #e2e8f0;
                        max-width: 500px;
                        width: 90%;
                        margin: 2rem;
                        animation: fadeInUp 0.5s ease-out;
                    }
                    
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    .org-required-icon {
                        width: 120px;
                        height: 120px;
                        background: #f1f5f9;
                        border: 2px solid #e2e8f0;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px;
                    }
                    
                    .org-required-icon i {
                        font-size: 64px;
                        color: #64748b;
                    }
                    
                    .org-required-content h2 {
                        color: #1e293b;
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 12px;
                        font-family: 'Inter', sans-serif;
                    }
                    
                    .org-required-content p {
                        color: #64748b;
                        font-size: 16px;
                        margin-bottom: 32px;
                        line-height: 1.6;
                        font-family: 'Inter', sans-serif;
                    }
                    
                    .org-required-actions {
                        display: flex;
                        gap: 12px;
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    
                    .btn-primary, .btn-secondary {
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 600;
                        text-decoration: none;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                        border: none;
                        cursor: pointer;
                        font-size: 14px;
                        font-family: 'Inter', sans-serif;
                        min-width: 140px;
                        justify-content: center;
                    }
                    
                    .btn-primary {
                        background: #3b82f6;
                        color: white;
                    }
                    
                    .btn-primary:hover {
                        background: #2563eb;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                    }
                    
                    .btn-secondary {
                        background: #ffffff;
                        color: #64748b;
                        border: 1px solid #e2e8f0;
                    }
                    
                    .btn-secondary:hover {
                        background: #f8fafc;
                        border-color: #cbd5e1;
                        color: #475569;
                        transform: translateY(-1px);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    
                    /* Responsive design */
                    @media (max-width: 768px) {
                        .org-required-section {
                            left: 0;
                            width: 100%;
                        }
                        
                        .org-required-container {
                            padding: 32px 24px;
                            margin: 1rem;
                        }
                        
                        .org-required-icon {
                            width: 96px;
                            height: 96px;
                        }
                        
                        .org-required-icon i {
                            font-size: 48px;
                        }
                        
                        .org-required-content h2 {
                            font-size: 24px;
                        }
                        
                        .org-required-actions {
                            flex-direction: column;
                            align-items: center;
                        }
                        
                        .btn-primary,
                        .btn-secondary {
                            width: 100%;
                            max-width: 200px;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(orgRequiredSection);
        } else {
            orgRequiredSection.style.display = 'flex';
        }
    }

    checkOrganizationRequirement() {
        // Get current page from URL
        const currentPath = window.location.pathname;
        const restrictedPages = ['/dashboard', '/analytics', '/payroll', '/organizations'];
        
        console.log('🔍 Checking organization requirement for:', currentPath);
        
        // Only check for restricted pages
        if (!restrictedPages.some(page => currentPath.includes(page))) {
            console.log('✅ Page not restricted, skipping organization check');
            return false;
        }
        
        // If we have user data, make instant decision
        if (this.currentUser) {
            console.log('👤 User data available:', this.currentUser.role, 'Org:', this.currentUser.organization_id);
            
            // Super admin can access everything
            if (this.currentUser.role === 'super_admin') {
                console.log('✅ Super admin access granted - showing content instantly');
                this.showMainContent();
                return false;
            }
            
            // Other roles need organization
            if (!this.currentUser.organization_id) {
                console.log('🚫 Organization required for role:', this.currentUser.role);
                this.hideMainContentImmediately();
                this.showOrganizationRequirement();
                return true;
            } else {
                console.log('✅ Organization found, access granted - showing content instantly');
                this.showMainContent();
                return false;
            }
        } else {
            console.log('⏳ User data not yet available - hiding content until auth completes');
            this.hideMainContentImmediately();
            // Don't show loading state - just wait for auth to complete
            return true;
        }
    }

    hideMainContentImmediately() {
        // Hide all possible main content areas immediately
        const selectors = [
            '.dashboard-main', '.analytics-main', '.users-main', 
            '.settings-main', '.payroll-main', '.organizations-main',
            '.main-content', '.app-content', '.content-area',
            '#mainContent', '#appContent'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.style.opacity = '0';
                element.style.transition = 'none'; // Disable any CSS transitions
            });
        });
        
        console.log('🔒 Main content hidden immediately');
    }
    
    injectNavigationCSS() {
        // Inject CSS to specifically hide User Management button for non-super admin users
        if (!document.getElementById('navigationAntiFlicker')) {
            const style = document.createElement('style');
            style.id = 'navigationAntiFlicker';
            
            // Check if user is super admin by looking at localStorage or making a quick check
            const checkSuperAdmin = () => {
                // Try to get user data from localStorage first
                const userData = localStorage.getItem('userData');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        return user.role === 'super_admin';
                    } catch (e) {
                        // If parsing fails, continue with the check
                    }
                }
                
                // If no localStorage data, check if we have a token and make a quick request
                const token = localStorage.getItem('token');
                if (token) {
                    // Make a synchronous check - this is a fallback
                    return false; // Default to false, will be updated later
                }
                
                return false; // Default to false
            };
            
            const isSuperAdmin = checkSuperAdmin();
            
            style.textContent = `
                /* Only hide User Management button initially for non-super admins */
                ${!isSuperAdmin ? `
                .enhanced-sidebar-nav a[href="/users"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                ` : ''}
                
                /* Class to permanently hide User Management for admin and below */
                .nav-hidden-admin {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
                
                /* Class to show User Management for super admin only */
                .nav-show-super-admin {
                    display: flex !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
            `;
            document.head.appendChild(style);
            console.log('🎨 Navigation CSS injected - User Management hidden by default for non-super admins');
        }
    }

    showMainContent() {
        // Remove organization requirement if it exists
        const orgRequired = document.querySelector('.org-required-section, #organizationRequired');
        if (orgRequired) {
            orgRequired.remove();
        }
        
        // Remove loading state if it exists
        const loadingState = document.querySelector('#orgLoadingState');
        if (loadingState) {
            loadingState.remove();
        }
        
        // Show main content instantly
        const selectors = [
            '.dashboard-main', '.analytics-main', '.users-main', 
            '.settings-main', '.payroll-main', '.organizations-main',
            '.main-content', '.app-content', '.content-area',
            '#mainContent', '#appContent'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = '';
                element.style.visibility = 'visible';
                element.style.opacity = '1';
            });
        });
        
        console.log('✅ Main content shown instantly');
    }

    showOrganizationLoadingState() {
        // Remove any existing organization content
        const existing = document.querySelector('.org-required-section, #organizationRequired');
        if (existing) {
            existing.remove();
        }
        
        // Create loading state
        const loadingHtml = `
            <div class="org-required-section" id="orgLoadingState">
                <div class="org-required-container">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                    <p style="margin-top: 16px; color: #64748b;">Checking access permissions...</p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
        
        // Add spinner styles
        if (!document.getElementById('loadingSpinnerStyles')) {
            const style = document.createElement('style');
            style.id = 'loadingSpinnerStyles';
            style.textContent = `
                .loading-spinner {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e2e8f0;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        console.log('🔄 Updating user info with:', this.currentUser);

        // Update elements by ID (for compatibility)
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userFirstNameEl = document.getElementById('userFirstName');
        const topUserNameEl = document.getElementById('topUserName');

        if (userNameEl) {
            userNameEl.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }
        if (userRoleEl) {
            userRoleEl.textContent = this.formatRole(this.currentUser.role);
        }
        if (userFirstNameEl) {
            userFirstNameEl.textContent = this.currentUser.first_name;
        }
        if (topUserNameEl) {
            topUserNameEl.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }

        // Update elements by class (for sidebar and other components)
        const userNameEls = document.querySelectorAll('.user-name');
        const userEmailEls = document.querySelectorAll('.user-email');
        const userAvatarEls = document.querySelectorAll('.user-avatar');

        const fullName = `${this.currentUser.first_name || ''} ${this.currentUser.last_name || ''}`.trim();
        const email = this.currentUser.email || '';
        const initials = this.getInitials(this.currentUser.first_name, this.currentUser.last_name);

        console.log(`🔄 Updating ${userNameEls.length} name elements with: "${fullName}"`);
        console.log(`🔄 Updating ${userEmailEls.length} email elements with: "${email}"`);
        console.log(`🔄 Updating ${userAvatarEls.length} avatar elements with: "${initials}"`);

        userNameEls.forEach((el, index) => {
            console.log(`📝 Updating user name element ${index + 1} to:`, fullName);
            el.textContent = fullName || 'User';
        });

        userEmailEls.forEach((el, index) => {
            console.log(`📧 Updating user email element ${index + 1} to:`, email);
            el.textContent = email;
        });

        userAvatarEls.forEach((el, index) => {
            console.log(`👤 Updating user avatar element ${index + 1} to:`, initials);
            el.textContent = initials;
        });

        // Show/hide navigation items based on role
        this.updateNavigationVisibility();
    }

    getInitials(firstName, lastName) {
        const first = (firstName || '').charAt(0).toUpperCase();
        const last = (lastName || '').charAt(0).toUpperCase();
        return first + last || 'U';
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

    updateNavigationVisibility() {
        if (!this.currentUser) return;

        console.log('🔧 Updating navigation visibility for role:', this.currentUser.role);

        // Get all navigation items
        const dashboardNav = document.querySelector('a[href="/dashboard"]');
        const analyticsNav = document.querySelector('a[href="/analytics"]');
        const usersNav = document.querySelector('a[href="/users"]');
        const payrollNav = document.querySelector('a[href="/payroll"]');
        const organizationsNav = document.querySelector('a[href="/organizations"]');
        const settingsNav = document.querySelector('a[href="/settings"]');

        // Hide all navigation items first
        [dashboardNav, analyticsNav, usersNav, payrollNav, organizationsNav, settingsNav].forEach(nav => {
            if (nav) {
                nav.style.display = 'none';
                nav.style.visibility = 'hidden';
                nav.style.opacity = '0';
            }
        });

        if (this.currentUser.role === 'super_admin') {
            // Super Admin sees: Dashboard, Analytics, User Management, Settings
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
                console.log('✅ User Management shown for super admin');
            }
            
            // COMPLETELY REMOVE Payroll and Organizations for super admin
            [payrollNav, organizationsNav].forEach(nav => {
                if (nav) {
                    // Remove from DOM completely
                    nav.remove();
                    console.log('🗑️ Completely removed navigation item from shared.js:', nav.href);
                }
            });
            
            console.log('✅ Super Admin navigation: Dashboard, Analytics, User Management, Settings');
        } else {
            // Admin/Manager/Employee sees: Dashboard, Analytics, Payroll, Organizations, Settings
            [dashboardNav, analyticsNav, payrollNav, organizationsNav, settingsNav].forEach(nav => {
                if (nav) {
                    nav.style.display = 'flex';
                    nav.style.visibility = 'visible';
                    nav.style.opacity = '1';
                }
            });
            
            // COMPLETELY REMOVE User Management for Admin and below
            if (usersNav) {
                // Remove from DOM completely
                usersNav.remove();
                console.log('🗑️ Completely removed User Management from shared.js for Admin role and below');
            }
            
            console.log('✅ Standard navigation: Dashboard, Analytics, Payroll, Organizations, Settings');
        }

        console.log('✅ Navigation visibility updated');
    }

    setupEventListeners() {
        // Logout button - handle both ID and onclick
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Set up global logout function for onclick handlers
        window.logout = () => this.logout();

        // Set up navigation interceptors for organization requirement
        this.setupNavigationInterceptors();

        // Auth form switching
        const showSignupLink = document.getElementById('showSignup');
        const showLoginLink = document.getElementById('showLogin');
        
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupForm();
            });
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Add event listener for potential logout buttons with class
        const logoutBtns = document.querySelectorAll('.enhanced-logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        });

        console.log('✅ Event listeners setup complete');
    }

    setupNavigationInterceptors() {
        // Pages that require organization for admin and below
        const restrictedPages = ['/dashboard', '/analytics', '/payroll', '/organizations'];
        
        // Get all navigation links
        const navLinks = document.querySelectorAll('a[href^="/"]');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            if (restrictedPages.includes(href)) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    if (!this.currentUser) {
                        console.log('❌ No user data for navigation check');
                        return;
                    }
                    
                    // Super admin always has access
                    if (this.currentUser.role === 'super_admin') {
                        console.log('✅ Super admin navigation - allowing access to:', href);
                        window.location.href = href;
                        return;
                    }
                    
                    // Check organization requirement for admin and below
                    if (!this.currentUser.organization_id) {
                        console.log('❌ Organization required for navigation to:', href);
                        this.showOrganizationRequirement();
                        
                        // Update URL without triggering page load
                        window.history.pushState({}, '', href);
                        return;
                    }
                    
                    // User has organization, allow navigation
                    console.log('✅ Organization check passed - navigating to:', href);
                    window.location.href = href;
                });
            }
        });
        
        // Handle browser back/forward navigation
        window.addEventListener('popstate', () => {
            this.checkCurrentPageAccess();
        });
    }
    
    attachFormEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginFormElement');
        console.log('🔍 Fallback: Looking for login form:', loginForm);
        if (loginForm && !loginForm.hasAttribute('data-listener-attached')) {
            console.log('✅ Fallback: Login form found, attaching event listener');
            loginForm.setAttribute('data-listener-attached', 'true');
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Signup form submission
        const signupForm = document.getElementById('signupFormElement');
        if (signupForm && !signupForm.hasAttribute('data-listener-attached')) {
            signupForm.setAttribute('data-listener-attached', 'true');
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
    }

    setupNavigationActiveState() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard';
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('active');
            }
        });
    }

    updateDateTime() {
        const now = new Date();
        
        // Update date
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Update time
        const timeEl = document.getElementById('currentTime');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }

    clearUrlParameters() {
        // Remove any URL parameters to prevent credential exposure
        if (window.location.search && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('🔒 Cleared URL parameters for security');
        }
    }

    showAuthContainer() {
        console.log('🔍 [DEBUG] showAuthContainer called. Should show login form and hide app container.');
        const loadingScreen = document.getElementById('loadingScreen');
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (authContainer) {
            authContainer.style.display = 'flex';
        }
        
        if (appContainer) {
            appContainer.style.display = 'none';
        }
        
        // Automatically show login form first
        this.showLoginForm();
        
        console.log('✅ Auth container shown with login form');
    }

    showAppContainer() {
        console.log('🔍 [DEBUG] showAppContainer called. Should show dashboard and hide login form.');
        const loadingScreen = document.getElementById('loadingScreen');
        const authContainer = document.getElementById('authContainer');
        const appContainer = document.getElementById('appContainer');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (authContainer) {
            authContainer.style.display = 'none';
        }
        
        if (appContainer) {
            appContainer.style.display = 'flex';
        }
        console.log('✅ App container shown');
    }

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
    }

    showSignupForm() {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
    }

    async handleLogin(e) {
        e.preventDefault();
        console.log('🔍 Login form submitted');
        
        // Clear any URL parameters to prevent credential exposure
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        console.log('🔍 Login attempt for email:', email);
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            console.log('🔍 Login response status:', response.status);
            const data = await response.json();
            console.log('🔍 Login response data:', data);

            if (response.ok) {
                console.log('✅ Login successful, storing token');
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                
                this.showToast('Login successful!', 'success');
                
                // Set auth state and show app
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.updateUserInfo();
                this.showAppContainer();
                
                // Only redirect if we're not already on a protected page
                if (window.location.pathname === '/login' || window.location.pathname === '/') {
                    console.log('🔄 Redirecting to dashboard after login...');
                    window.location.href = '/dashboard';
                }
            } else {
                console.log('❌ Login failed:', data.message);
                this.showToast(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        // Clear any URL parameters to prevent credential exposure
        if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        const firstName = document.getElementById('signupFirstName').value;
        const lastName = document.getElementById('signupLastName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const inviteCode = document.getElementById('signupInviteCode').value;
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    firstName, 
                    lastName, 
                    email, 
                    password, 
                    inviteCode 
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Account created successfully! Please sign in.', 'success');
                this.showLoginForm();
            } else {
                this.showToast(data.message || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async logout() {
        console.log('🚪 Logout initiated...');
        
        try {
            const token = localStorage.getItem('token');
            if (token) {
                console.log('📡 Sending logout request to server...');
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    console.log('✅ Server logout successful');
                } else {
                    console.log('⚠️ Server logout failed, proceeding with local cleanup');
                }
            }
        } catch (error) {
            console.error('❌ Logout server request error:', error);
            console.log('⚠️ Proceeding with local cleanup despite server error');
        } finally {
            console.log('🧹 Cleaning up local storage and session...');
            
            // Clear all stored data
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken'); 
            localStorage.removeItem('userProfile');
            localStorage.removeItem('user');
            localStorage.removeItem('userEmail');
            sessionStorage.removeItem('employeeHubInitialized');
            
            // Clear current user
            this.currentUser = null;
            this.isAuthenticated = false;
            
            console.log('🔄 Redirecting to login page...');
            window.location.href = '/login';
        }
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    // Toast notifications
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };
        return icons[type] || icons.info;
    }

    // API helper
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        try {
            const response = await fetch(`/api${endpoint}`, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Utility functions
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        
        return this.formatDate(dateString);
    }

    // Debounce utility
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Helper function to get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        };
    }

    // Helper function to check if user is authenticated
    isUserAuthenticated() {
        return !!localStorage.getItem('token');
    }

    // Helper function to redirect to login if not authenticated
    requireAuth() {
        if (!this.isUserAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }
    
    // Load dashboard script dynamically
    loadDashboardScript() {
        if (!document.querySelector('script[src*="dashboard.js"]')) {
            console.log('📦 Loading dashboard script...');
            const script = document.createElement('script');
            script.src = '/js/dashboard.js';
            script.onload = () => console.log('✅ Dashboard script loaded');
            script.onerror = () => console.error('❌ Failed to load dashboard script');
            document.head.appendChild(script);
        }
    }
    
    // Load users script dynamically
    loadUsersScript() {
        if (!document.querySelector('script[src*="users.js"]')) {
            console.log('📦 Loading users script...');
            const script = document.createElement('script');
            script.src = '/js/users.js';
            script.onload = () => console.log('✅ Users script loaded');
            script.onerror = () => console.error('❌ Failed to load users script');
            document.head.appendChild(script);
        }
    }
}

// Initialize the app
const app = new EmployeeHub();

// Export for use in other modules
window.EmployeeHub = app;