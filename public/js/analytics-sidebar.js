// Analytics Page Specific Sidebar JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeAnalyticsSidebar();
});

function initializeAnalyticsSidebar() {
    const sidebar = document.getElementById('analytics-sidebar');
    const toggleBtn = document.getElementById('analytics-sidebar-toggle');
    
    if (!sidebar || !toggleBtn) {
        console.log('Analytics sidebar elements not found');
        return;
    }
    
    // Toggle sidebar
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('expanded');
        sidebar.classList.toggle('collapsed');
        
        // Save state to localStorage
        const isExpanded = sidebar.classList.contains('expanded');
        localStorage.setItem('analytics-sidebar-expanded', isExpanded);
    });
    
    // Load saved state
    const savedState = localStorage.getItem('analytics-sidebar-expanded');
    if (savedState === 'true') {
        sidebar.classList.add('expanded');
    } else {
        sidebar.classList.add('collapsed');
    }
    
    // Update user info
    updateAnalyticsSidebarUserInfo();
    
    // Set active navigation item
    setActiveAnalyticsNavItem();
}

function updateAnalyticsSidebarUserInfo() {
    const userNameEl = document.querySelector('.analytics-sidebar-user .user-name');
    const userEmailEl = document.querySelector('.analytics-sidebar-user .user-email');
    const userAvatarEl = document.querySelector('.analytics-sidebar-user .user-avatar');
    
    // Get user info from localStorage or shared.js
    const userEmail = localStorage.getItem('userEmail');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (userNameEl) {
        if (user.first_name && user.last_name) {
            userNameEl.textContent = `${user.first_name} ${user.last_name}`;
        } else {
            userNameEl.textContent = 'User';
        }
    }
    
    if (userEmailEl) {
        userEmailEl.textContent = userEmail || 'user@example.com';
    }
    
    if (userAvatarEl) {
        if (user.first_name && user.last_name) {
            userAvatarEl.textContent = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        } else {
            userAvatarEl.textContent = 'U';
        }
    }
}

function setActiveAnalyticsNavItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.analytics-sidebar-nav .nav-item');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        const itemPath = item.getAttribute('href');
        if (itemPath === currentPath) {
            item.classList.add('active');
        }
    });
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
} 