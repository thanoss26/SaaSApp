// Global redirect: Force any /app redirects to /dashboard
(function() {
    // Check current URL
    if (window.location.pathname === '/app') {
        console.log('🚫 BLOCKED: Attempted to access /app - redirecting to /');
        window.location.replace('/');
        return;
    }
    
    // Intercept any future redirects to /app
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        if (args[2] && args[2].includes('/app')) {
            console.log('🚫 BLOCKED: pushState to /app - redirecting to /');
            return originalPushState.call(this, args[0], args[1], '/');
        }
        return originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
        if (args[2] && args[2].includes('/app')) {
            console.log('🚫 BLOCKED: replaceState to /app - redirecting to /dashboard');
            return originalReplaceState.call(this, args[0], args[1], '/');
        }
        return originalReplaceState.apply(this, args);
    };
    
    // Intercept window.location changes
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    
    window.location.assign = function(url) {
        if (url && url.includes('/app')) {
            console.log('🚫 BLOCKED: location.assign to /app - redirecting to /dashboard');
            return originalAssign.call(this, '/dashboard');
        }
        return originalAssign.apply(this, arguments);
    };
    
    window.location.replace = function(url) {
        if (url && url.includes('/app')) {
            console.log('🚫 BLOCKED: location.replace to /app - redirecting to /dashboard');
            return originalReplace.call(this, '/dashboard');
        }
        return originalReplace.apply(this, arguments);
    };
    
    Object.defineProperty(window.location, 'href', {
        set: function(url) {
            if (url && url.includes('/app')) {
                console.log('🚫 BLOCKED: location.href to /app - redirecting to /dashboard');
                return originalHref.set.call(this, '/dashboard');
            }
            return originalHref.set.call(this, url);
        },
        get: originalHref.get
    });
})();

// Shared JavaScript for EmployeeHub
class EmployeeHub {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isRedirecting = false;
        this.isInitialized = false;
        this.isCheckingAuth = false;
        this.init();
    }

    async init() {
        // Check if we've already initialized in this session
        if (sessionStorage.getItem('employeeHubInitialized')) {
            console.log('⚠️ Already initialized in this session, skipping...');
            return;
        }
        
        if (this.isInitialized) {
            console.log('⚠️ Already initialized, skipping...');
            return;
        }
        
        console.log('🚀 Initializing EmployeeHub...');
        console.log('🔍 Current pathname:', window.location.pathname);
        
        // Clear any URL parameters to prevent credential exposure
        this.clearUrlParameters();
        
        // Show loading screen initially
        this.showLoadingScreen();
        
        await this.checkAuth();
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        
        this.isInitialized = true;
        sessionStorage.setItem('employeeHubInitialized', 'true');
        console.log('✅ EmployeeHub initialized');
    }

            async checkAuth() {
        try {
            console.log('🔍 Checking authentication...');
            
            // Prevent multiple auth checks
            if (this.isCheckingAuth) {
                console.log('⚠️ Auth check already in progress, skipping...');
                return;
            }
            this.isCheckingAuth = true;
            
            // Always show login form first when visiting the root page
            if (window.location.pathname === '/') {
                console.log('🏠 On root page, showing login form first');
                this.showAuthContainer();
                this.isCheckingAuth = false;
                return;
            }
            
            const token = localStorage.getItem('token');
            console.log('🔍 Token exists:', !!token);
            
            if (!token) {
                console.log('❌ No token found, showing auth container');
                this.showAuthContainer();
                this.isCheckingAuth = false;
                return;
            }
            
            // If we're on a protected page and have a token, verify and show app
            const protectedPages = ['/dashboard', '/users', '/organizations', '/payroll', '/analytics', '/settings'];
            if (protectedPages.includes(window.location.pathname) && token) {
                console.log('🔍 Verifying token for protected page...');
                
                try {
                    const response = await fetch('/api/auth/verify', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Token verified, showing app container');
                        this.currentUser = data.user;
                        this.isAuthenticated = true;
                        this.updateUserInfo();
                        this.showAppContainer();
                        
                        // Load appropriate script for the page
                        if (window.location.pathname === '/dashboard') {
                            this.loadDashboardScript();
                        } else if (window.location.pathname === '/users') {
                            this.loadUsersScript();
                        }
                    } else {
                        throw new Error('Token verification failed');
                    }
                } catch (error) {
                    console.error('❌ Token verification failed:', error);
                    this.showAuthContainer();
                }
                
                this.isCheckingAuth = false;
                return;
            }

            // For any other pages, show auth container
            console.log('❌ Not on protected page, showing auth container');
            this.showAuthContainer();
            
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            this.showAuthContainer();
        } finally {
            this.isCheckingAuth = false;
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

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

        // Show/hide navigation items based on role
        this.updateNavigationVisibility();
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

        const employeesNav = document.getElementById('employeesNav');
        const orgNav = document.getElementById('orgNav');

        // Show employees nav for all roles except organization_member
        if (employeesNav) {
            if (this.currentUser.role === 'organization_member') {
                employeesNav.style.display = 'none';
            } else {
                employeesNav.style.display = 'flex';
            }
        }

        // Show organization nav for admin and super_admin only
        if (orgNav) {
            if (['admin', 'super_admin'].includes(this.currentUser.role)) {
                orgNav.style.display = 'flex';
            } else {
                orgNav.style.display = 'none';
            }
        }
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

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

        // Login form submission
        const loginForm = document.getElementById('loginFormElement');
        console.log('🔍 Looking for login form:', loginForm);
        if (loginForm) {
            console.log('✅ Login form found, attaching event listener');
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        } else {
            console.log('❌ Login form not found');
        }

        // Signup form submission
        const signupForm = document.getElementById('signupFormElement');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Navigation active state
        this.setupNavigationActiveState();
        
        // Fallback: Try to attach event listeners again after a short delay
        setTimeout(() => {
            this.attachFormEventListeners();
        }, 100);
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
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.showToast('Login successful!', 'success');
                
                // Redirect to dashboard after successful login
                setTimeout(() => {
                    console.log('🔄 Redirecting to dashboard after login...');
                    window.location.replace('/dashboard');
                }, 1000);
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
            localStorage.removeItem('userProfile');
            sessionStorage.removeItem('employeeHubInitialized');
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
            script.src = '/js/dashboard.js?v=1.0.4';
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
            script.src = '/js/users.js?v=1.0.4';
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