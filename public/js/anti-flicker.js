// ANTI-FLICKER NAVIGATION SETUP
(function() {
    console.log('🚀 Anti-flicker navigation setup starting...');
    
    // Hide all navigation items initially
    const allNavItems = document.querySelectorAll('.enhanced-sidebar-nav a');
    allNavItems.forEach(item => {
        item.style.display = 'none';
    });
    
    // Function to hide overlay and show content
    function showPage() {
        console.log('🎯 Showing page content...');
        
        // Hide the anti-flicker overlay
        const overlay = document.getElementById('anti-flicker-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            console.log('✅ Anti-flicker overlay hidden');
        }
        
        // Show the main content
        const appContainer = document.querySelector('.dashboard-layout, .analytics-layout, .settings-layout, .users-layout');
        if (appContainer) {
            appContainer.classList.add('navigation-ready');
            console.log('✅ Main content shown');
        }
        
        // Show all navigation items as fallback
        allNavItems.forEach(item => {
            item.style.display = 'flex';
            item.style.visibility = 'visible';
            item.style.opacity = '1';
        });
        console.log('✅ All navigation items shown as fallback');
    }
    
    // Function to setup navigation based on user role
    async function setupNavigation() {
        try {
            console.log('🔍 Fetching user profile for navigation setup...');
            
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }
            
            const data = await response.json();
            const profile = data.profile || data;
            
            console.log('👤 Profile loaded for navigation setup:', profile);
            
            // Get navigation elements
            const dashboardNav = document.querySelector('a[href="/dashboard"]');
            const analyticsNav = document.querySelector('a[href="/analytics"]');
            const usersNav = document.querySelector('a[href="/users"]');
            const payrollNav = document.querySelector('a[href="/payroll"]');
            const organizationsNav = document.querySelector('a[href="/organizations"]');
            const settingsNav = document.querySelector('a[href="/settings"]');
            
            if (profile.role === 'super_admin') {
                console.log('👑 Setting up navigation for super admin');
                
                // Show: Dashboard, Analytics, User Management, Settings
                // COMPLETELY REMOVE: Payroll, Organizations
                [dashboardNav, analyticsNav, usersNav, settingsNav].forEach(nav => {
                    if (nav) {
                        nav.style.display = 'flex';
                        nav.style.visibility = 'visible';
                        nav.style.opacity = '1';
                    }
                });
                
                // COMPLETELY REMOVE Payroll and Organizations for super admin
                [payrollNav, organizationsNav].forEach(nav => {
                    if (nav) {
                        // Remove from DOM completely
                        nav.remove();
                        console.log('🗑️ Completely removed navigation item:', nav.href);
                    }
                });
                
                console.log('✅ Super admin navigation setup complete - Payroll and Organizations completely removed');
            } else {
                console.log('👤 Setting up navigation for regular user');
                
                // Show: Dashboard, Analytics, Payroll, Organizations, Settings
                // COMPLETELY REMOVE: User Management for Admin and below
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
                    console.log('🗑️ Completely removed User Management for Admin role and below');
                }
                
                console.log('✅ Regular user navigation setup complete - User Management completely removed');
            }
            
            // Hide overlay and show content
            showPage();
            
            console.log('🎉 Navigation setup complete - page ready');
            
        } catch (error) {
            console.error('❌ Error setting up navigation:', error);
            
            // On error, show all navigation items and hide overlay
            showPage();
        }
    }
    
    // Start navigation setup immediately
    setupNavigation();
    
    // FALLBACK: Hide overlay after 2 seconds if it's still showing
    setTimeout(async () => {
        const overlay = document.getElementById('anti-flicker-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            console.log('⏰ Fallback: Overlay hidden after timeout');
        }
        
        // Try to get user role for proper fallback navigation
        try {
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const profile = data.profile || data;
                
                if (profile.role === 'super_admin') {
                    console.log('👑 Fallback: Setting up super admin navigation');
                    
                    // Show only super admin navigation items
                    const dashboardNav = document.querySelector('a[href="/dashboard"]');
                    const analyticsNav = document.querySelector('a[href="/analytics"]');
                    const usersNav = document.querySelector('a[href="/users"]');
                    const settingsNav = document.querySelector('a[href="/settings"]');
                    const payrollNav = document.querySelector('a[href="/payroll"]');
                    const organizationsNav = document.querySelector('a[href="/organizations"]');
                    
                    [dashboardNav, analyticsNav, usersNav, settingsNav].forEach(nav => {
                        if (nav) {
                            nav.style.display = 'flex';
                            nav.style.visibility = 'visible';
                            nav.style.opacity = '1';
                        }
                    });
                    
                    // Remove Payroll and Organizations completely
                    [payrollNav, organizationsNav].forEach(nav => {
                        if (nav) {
                            nav.remove();
                            console.log('🗑️ Fallback: Removed navigation item:', nav.href);
                        }
                    });
                } else {
                    console.log('👤 Fallback: Setting up regular user navigation');
                    
                    // Show only appropriate navigation items for Admin and below
                    const dashboardNav = document.querySelector('a[href="/dashboard"]');
                    const analyticsNav = document.querySelector('a[href="/analytics"]');
                    const usersNav = document.querySelector('a[href="/users"]');
                    const payrollNav = document.querySelector('a[href="/payroll"]');
                    const organizationsNav = document.querySelector('a[href="/organizations"]');
                    const settingsNav = document.querySelector('a[href="/settings"]');
                    
                    // Show: Dashboard, Analytics, Payroll, Organizations, Settings
                    [dashboardNav, analyticsNav, payrollNav, organizationsNav, settingsNav].forEach(nav => {
                        if (nav) {
                            nav.style.display = 'flex';
                            nav.style.visibility = 'visible';
                            nav.style.opacity = '1';
                        }
                    });
                    
                    // Remove User Management completely for Admin and below
                    if (usersNav) {
                        usersNav.remove();
                        console.log('🗑️ Fallback: Removed User Management for Admin role and below');
                    }
                }
            } else {
                // If profile fetch fails, show all items
                allNavItems.forEach(item => {
                    item.style.display = 'flex';
                    item.style.visibility = 'visible';
                    item.style.opacity = '1';
                });
            }
        } catch (error) {
            console.error('❌ Fallback: Error fetching profile, showing all navigation items');
            // Show all navigation items as final fallback
            allNavItems.forEach(item => {
                item.style.display = 'flex';
                item.style.visibility = 'visible';
                item.style.opacity = '1';
            });
        }
        
        // Show main content
        const appContainer = document.querySelector('.dashboard-layout, .analytics-layout, .settings-layout, .users-layout');
        if (appContainer) {
            appContainer.classList.add('navigation-ready');
        }
    }, 2000);
    
})(); 