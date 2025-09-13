// Enhanced Sidebar Component for Chronos HR
console.log('🚨 SIDEBAR.JS FILE LOADED!');

class EnhancedSidebar {
    constructor() {
        console.log('🔧 EnhancedSidebar: Constructor called');
        this.isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.currentPage = this.getCurrentPage();
        this.theme = localStorage.getItem('theme') || 'light';
        console.log('🎨 Current theme:', this.theme);
        
        // Apply theme immediately before initialization
        this.applyTheme();
        this.updateThemeIcon();
        
        this.init();
    }

    async init() {
        console.log('🚀 EnhancedSidebar: Initializing...');
        this.applyTheme(); // Apply theme first
        this.updateThemeIcon(); // Update icon based on current theme
        this.setupEventListeners();
        this.setActivePage();
        this.loadCollapsedState();
        console.log('✅ EnhancedSidebar: Initialized successfully');
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('/dashboard')) return 'dashboard';
        if (path.includes('/users')) return 'users';
        if (path.includes('/organizations')) return 'organizations';
        if (path.includes('/analytics')) return 'analytics';
        if (path.includes('/payroll')) return 'payroll';
        if (path.includes('/settings')) return 'settings';
        return 'dashboard';
    }

    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        // Debug: Check all elements with theme-toggle id
        const allElements = document.querySelectorAll('#theme-toggle');
        console.log('🔍 All elements with theme-toggle id:', allElements.length);
        allElements.forEach((el, index) => {
            console.log(`🔍 Element ${index}:`, el, 'Visible:', el.offsetParent !== null);
        });
        
        // Theme toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            console.log('🌙 Theme toggle found:', themeToggle);
            console.log('🌙 Theme toggle styles:', window.getComputedStyle(themeToggle));
            console.log('🌙 Theme toggle parent:', themeToggle.parentElement);
            themeToggle.addEventListener('click', () => {
                console.log('🎨 Theme toggle clicked!');
                this.toggleTheme();
            });
            
            console.log('✅ Theme toggle found and ready');
        } else {
            console.log('❌ Theme toggle not found');
            // Check if sidebar exists at all
            const sidebar = document.getElementById('enhanced-sidebar');
            console.log('🔍 Sidebar element:', sidebar);
            const controls = document.querySelector('.enhanced-sidebar-controls');
            console.log('🔍 Controls element:', controls);
        }

        // Sidebar toggle functionality
        const sidebarToggle = document.getElementById('enhanced-sidebar-toggle');
        if (sidebarToggle) {
            console.log('📱 Sidebar toggle found:', sidebarToggle);
            sidebarToggle.addEventListener('click', () => {
                console.log('📱 Sidebar toggle clicked!');
                this.toggleSidebar();
            });
        } else {
            console.log('❌ Sidebar toggle not found');
        }

        // Navigation links
        const navItems = document.querySelectorAll('.nav-item');
        console.log('🔗 Found nav items:', navItems.length);
        navItems.forEach(item => {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                console.log('🔗 Navigating to:', href);
                
                // Check if we have a token before navigating
                const token = localStorage.getItem('token');
                if (token) {
                    console.log('✅ Token exists, navigating to:', href);
                    window.location.href = href;
                } else {
                    console.log('❌ No token found, redirecting to login');
                    window.location.href = '/login';
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    toggleTheme() {
        console.log('🎨 Toggling theme from:', this.theme);
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        console.log('🎨 New theme:', this.theme);
        
        localStorage.setItem('theme', this.theme);
        this.applyTheme();
        this.updateThemeIcon();
        
        console.log('✅ Theme toggled successfully');
        this.showNotification(`Switched to ${this.theme} mode`);
    }

    applyTheme() {
        console.log('🎨 Applying theme:', this.theme);
        document.documentElement.setAttribute('data-theme', this.theme);
        document.body.setAttribute('data-theme', this.theme);
        
        // Apply dark class for CSS targeting
        if (this.theme === 'dark') {
            document.body.classList.add('dark');
            document.documentElement.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
            document.documentElement.classList.remove('dark');
        }
        
        console.log('✅ Theme applied');
    }

    updateThemeIcon() {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            // In light mode, show moon (to switch to dark)
            // In dark mode, show sun (to switch to light)
            if (this.theme === 'light') {
                themeIcon.className = 'fas fa-moon';
                console.log('🌙 Updated icon to moon');
            } else {
                themeIcon.className = 'fas fa-sun';
                console.log('☀️ Updated icon to sun');
            }
        } else {
            console.log('❌ Theme icon not found');
        }
    }

    toggleSidebar() {
        console.log('📱 Toggling sidebar collapse state');
        const sidebar = document.getElementById('enhanced-sidebar');
        if (sidebar) {
            this.isCollapsed = !this.isCollapsed;
            sidebar.classList.toggle('collapsed', this.isCollapsed);
            localStorage.setItem('sidebarCollapsed', this.isCollapsed);
            console.log('📱 Sidebar toggled, collapsed:', this.isCollapsed);
        }
    }

    loadCollapsedState() {
        console.log('📱 Loading sidebar collapse state:', this.isCollapsed);
        const sidebar = document.getElementById('enhanced-sidebar');
        if (sidebar && this.isCollapsed) {
            sidebar.classList.add('collapsed');
        }
    }

    setActivePage() {
        console.log('🎯 Setting active page:', this.currentPage);
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            if (page === this.currentPage) {
                item.classList.add('active');
                console.log('✅ Set active page:', page);
            } else {
                item.classList.remove('active');
            }
        });
    }

    showNotification(message) {
        console.log('📢 Showing notification:', message);
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4f46e5;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize sidebar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM LOADED - Creating Enhanced Sidebar!');
    new EnhancedSidebar();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('📋 DOM still loading, waiting...');
} else {
    console.log('🚀 DOM already loaded - Creating Enhanced Sidebar!');
    new EnhancedSidebar();
} 