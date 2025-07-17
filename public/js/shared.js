// Shared JavaScript for EmployeeHub
class EmployeeHub {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    async init() {
        // Show loading screen initially
        this.showLoadingScreen();
        
        await this.checkAuth();
        this.setupEventListeners();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
    }

            async checkAuth() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showAuthContainer();
                return;
            }

            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const data = await response.json();
            this.currentUser = data.user;
            this.isAuthenticated = true;
            this.updateUserInfo();
            this.showAppContainer();
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthContainer();
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
        // Logout buttons
        const logoutBtn = document.getElementById('logoutBtn');
        const topLogoutBtn = document.getElementById('topLogoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        if (topLogoutBtn) {
            topLogoutBtn.addEventListener('click', () => this.logout());
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
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form submission
        const signupForm = document.getElementById('signupFormElement');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Navigation active state
        this.setupNavigationActiveState();
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

    showAuthContainer() {
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
    }

    showAppContainer() {
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
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.showToast('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                this.showToast(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
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
            window.location.href = '/';
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
        const token = localStorage.getItem('authToken');
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
}

// Initialize the app
const app = new EmployeeHub();

// Export for use in other modules
window.EmployeeHub = app;