console.log('🔽 Loading dropdown.js file...');

// Global dropdown state
window.dropdownOpen = false;

// Global dropdown toggle function
window.toggleUserDropdown = function(event) {
    console.log('🔥 GLOBAL toggleUserDropdown called!');
    event.stopPropagation();
    
    const menu = document.getElementById('userDropdownMenu');
    const arrow = document.getElementById('dropdownArrow');
    
    if (!menu) {
        console.log('❌ Menu not found');
        return;
    }
    
    if (window.dropdownOpen) {
        console.log('🔼 Closing dropdown');
        menu.style.display = 'none';
        menu.classList.remove('show');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        window.dropdownOpen = false;
    } else {
        console.log('🔽 Opening dropdown');
        menu.style.display = 'block';
        menu.classList.add('show');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        window.dropdownOpen = true;
    }
};

// Global logout function
window.handleLogout = function() {
    console.log('🚪 Logout clicked');
    if (confirm('Are you sure you want to log out?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }
};

// Test that functions are available
console.log('🔍 Testing function availability:', {
    toggleUserDropdown: typeof window.toggleUserDropdown,
    handleLogout: typeof window.handleLogout
});

// Test the function directly
if (typeof window.toggleUserDropdown === 'function') {
    console.log('✅ toggleUserDropdown function is ready!');
} else {
    console.log('❌ toggleUserDropdown function failed to load!');
}

// Wait for DOM to load before adding outside click listener
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded, adding outside click listener');
    
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('userDropdownMenu');
        const trigger = event.target.closest('.dashboard-user');
        
        if (!trigger && dropdown && window.dropdownOpen) {
            console.log('🔼 Closing dropdown (clicked outside)');
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
            const arrow = document.getElementById('dropdownArrow');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            window.dropdownOpen = false;
        }
    });
});

// Setup all dropdown functionality
function setupDropdownFallback() {
    console.log('🔧 Setting up dropdown functionality...');
    
    // Setup dropdown trigger
    const trigger = document.getElementById('dashboardUserTrigger');
    if (trigger) {
        console.log('🎯 Found dropdown trigger element');
        
        // Remove onclick to prevent conflicts
        trigger.removeAttribute('onclick');
        console.log('🗑️ Removed onclick attribute');
        
        // Add event listener for dropdown toggle
        trigger.addEventListener('click', function(event) {
            console.log('🔥 Dropdown trigger clicked!');
            event.stopPropagation();
            event.preventDefault();
            
            const menu = document.getElementById('userDropdownMenu');
            const arrow = document.getElementById('dropdownArrow');
            
            if (!menu) {
                console.log('❌ Menu not found');
                return;
            }
            
            // Simple toggle logic
            const isHidden = menu.style.display === 'none' || !menu.style.display;
            
            if (isHidden) {
                console.log('🔽 Opening dropdown');
                menu.style.display = 'block';
                menu.classList.add('show');
                if (arrow) arrow.style.transform = 'rotate(180deg)';
                window.dropdownOpen = true;
                
                // Immediately setup menu items when dropdown opens
                console.log('🚀 About to setup dropdown items...');
                setupDropdownMenuItemsImmediate();
                
                setTimeout(() => {
                    console.log('🚀 RETRY: Setting up dropdown items after 50ms...');
                    setupDropdownMenuItemsImmediate();
                }, 50);
                
                setTimeout(() => {
                    console.log('🚀 RETRY: Setting up dropdown items after 200ms...');
                    setupDropdownMenuItemsImmediate();
                }, 200);
            } else {
                console.log('🔼 Closing dropdown');
                menu.style.display = 'none';
                menu.classList.remove('show');
                if (arrow) arrow.style.transform = 'rotate(0deg)';
                window.dropdownOpen = false;
            }
        }, true); // Use capture phase
        
        console.log('✅ Dropdown trigger event listener added');
    } else {
        console.log('❌ Dropdown trigger element not found');
    }
    
    // Setup dropdown menu item handlers
    setTimeout(function() {
        setupDropdownMenuItems();
    }, 100);
    
    // Also setup menu items multiple times to ensure they work
    setTimeout(function() {
        setupDropdownMenuItems();
    }, 500);
    
    setTimeout(function() {
        setupDropdownMenuItems();
    }, 1000);
}

// Setup individual menu item functionality
function setupDropdownMenuItems() {
    console.log('🔧 Setting up dropdown menu items...');
    
    // Helper function to close dropdown
    function closeDropdown() {
        const menu = document.getElementById('userDropdownMenu');
        const arrow = document.getElementById('dropdownArrow');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('show');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            window.dropdownOpen = false;
        }
    }
    
    // Define the click handler function first
    function handleDropdownClick(event) {
        console.log('🔥 Dropdown menu clicked!', event.target);
        
        // Find the closest dropdown item
        const dropdownItem = event.target.closest('.dropdown-item');
        if (!dropdownItem) {
            console.log('❌ Not a dropdown item');
            return;
        }
        
        console.log('✅ Dropdown item clicked:', dropdownItem.id || dropdownItem.className);
        event.preventDefault();
        event.stopPropagation();
        
        // Handle different menu items
        if (dropdownItem.id === 'profile-menu-item') {
            console.log('👤 Profile button clicked via delegation');
            closeDropdown();
            console.log('🔄 Navigating to profile page...');
            window.location.href = '/profile';
            
        } else if (dropdownItem.id === 'settings-menu-item') {
            console.log('⚙️ Settings button clicked via delegation');
            closeDropdown();
            console.log('🔄 Navigating to settings page...');
            window.location.href = '/settings';
            
        } else if (dropdownItem.id === 'logout-menu-item') {
            console.log('🚪 Logout button clicked via delegation');
            
            if (confirm('Are you sure you want to log out?')) {
                console.log('🚪 User confirmed logout');
                console.log('🔄 Clearing cache and redirecting...');
                
                // Clear all cached data
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = '/login';
            } else {
                console.log('🚫 User cancelled logout');
            }
        } else {
            console.log('❓ Unknown dropdown item clicked');
        }
    }
    
    // Use event delegation on the dropdown menu container
    const dropdownMenu = document.getElementById('userDropdownMenu');
    if (dropdownMenu) {
        // Remove any existing listeners to prevent duplicates
        dropdownMenu.removeEventListener('click', handleDropdownClick);
        
        // Add single event listener for all dropdown items
        dropdownMenu.addEventListener('click', handleDropdownClick);
        console.log('✅ Dropdown menu event delegation added');
    } else {
        console.log('❌ Dropdown menu container not found');
    }
    
    // Also setup individual listeners as fallback
    setupIndividualListeners(closeDropdown);
}

// Fallback individual listeners
function setupIndividualListeners(closeDropdown) {
    console.log('🔧 Setting up individual fallback listeners...');
    
    // Profile button
    const profileBtn = document.getElementById('profile-menu-item');
    if (profileBtn) {
        profileBtn.addEventListener('click', function(event) {
            console.log('👤 Profile button clicked (individual)');
            event.preventDefault();
            event.stopPropagation();
            closeDropdown();
            console.log('🔄 Navigating to profile page...');
            window.location.href = '/profile';
        });
        console.log('✅ Profile button handler added');
    } else {
        console.log('❌ Profile button not found');
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settings-menu-item');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(event) {
            console.log('⚙️ Settings button clicked (individual)');
            event.preventDefault();
            event.stopPropagation();
            closeDropdown();
            console.log('🔄 Navigating to settings page...');
            window.location.href = '/settings';
        });
        console.log('✅ Settings button handler added');
    } else {
        console.log('❌ Settings button not found');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-menu-item');
    if (logoutBtn) {
        logoutBtn.removeAttribute('onclick');
        logoutBtn.addEventListener('click', function(event) {
            console.log('🚪 Logout button clicked (individual)');
            event.preventDefault();
            event.stopPropagation();
            
            if (confirm('Are you sure you want to log out?')) {
                console.log('🚪 User confirmed logout');
                console.log('🔄 Clearing cache and redirecting...');
                
                // Clear all cached data
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = '/login';
            } else {
                console.log('🚫 User cancelled logout');
            }
        });
        console.log('✅ Logout button handler added');
    } else {
        console.log('❌ Logout button not found');
    }
}

// Setup all dropdown items with click handlers
function setupDropdownMenuItemsImmediate() {
    console.log('🚀 IMMEDIATE: Setting up ALL dropdown items...');
    
    // Helper function to close dropdown
    function closeDropdown() {
        const menu = document.getElementById('userDropdownMenu');
        const arrow = document.getElementById('dropdownArrow');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('show');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            window.dropdownOpen = false;
        }
    }
    
    // Profile button
    const profileBtn = document.getElementById('profile-menu-item');
    if (profileBtn) {
        console.log('🚀 IMMEDIATE: Setting up profile button');
        
        // Multiple event listeners
        profileBtn.onclick = function(e) {
            console.log('🔥 PROFILE CLICK: Profile button clicked via onclick!');
            e.preventDefault();
            e.stopPropagation();
            closeDropdown();
            console.log('🔄 Navigating to profile...');
            window.location.href = '/profile';
        };
        
        profileBtn.addEventListener('click', function(e) {
            console.log('🔥 PROFILE CLICK: Profile button clicked via addEventListener!');
            e.preventDefault();
            e.stopPropagation();
            closeDropdown();
            console.log('🔄 Navigating to profile...');
            window.location.href = '/profile';
        }, true);
        
        profileBtn.addEventListener('mousedown', function(e) {
            console.log('🔥 PROFILE MOUSEDOWN: Profile button mousedown detected!');
        });
        
        profileBtn.addEventListener('mouseup', function(e) {
            console.log('🔥 PROFILE MOUSEUP: Profile button mouseup detected!');
            console.log('🔄 MOUSEUP NAVIGATION: Going to profile...');
            e.preventDefault();
            e.stopPropagation();
            closeDropdown();
            window.location.href = '/profile';
        });
        
        console.log('✅ IMMEDIATE: Profile button setup complete');
    } else {
        console.log('❌ IMMEDIATE: Profile button not found');
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settings-menu-item');
    if (settingsBtn) {
        console.log('🚀 IMMEDIATE: Setting up settings button');
        
        settingsBtn.onclick = function(e) {
            console.log('🔥 SETTINGS CLICK: Settings button clicked via onclick!');
            e.preventDefault();
            e.stopPropagation();
            closeDropdown();
            console.log('🔄 Navigating to settings...');
            window.location.href = '/settings';
        };
        
        settingsBtn.addEventListener('click', function(e) {
            console.log('🔥 SETTINGS CLICK: Settings button clicked via addEventListener!');
            e.preventDefault();
            e.stopPropagation();
            closeDropdown();
            console.log('🔄 Navigating to settings...');
            window.location.href = '/settings';
        }, true);
        
        settingsBtn.addEventListener('mousedown', function(e) {
            console.log('🔥 SETTINGS MOUSEDOWN: Settings button mousedown detected!');
        });
        
        settingsBtn.addEventListener('mouseup', function(e) {
            console.log('🔥 SETTINGS MOUSEUP: Settings button mouseup detected!');
            console.log('🔄 MOUSEUP NAVIGATION: Going to settings...');
            e.preventDefault();
            e.stopPropagation();
            closeDropdown();
            window.location.href = '/settings';
        });
        
        console.log('✅ IMMEDIATE: Settings button setup complete');
    } else {
        console.log('❌ IMMEDIATE: Settings button not found');
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-menu-item');
    if (logoutBtn) {
        console.log('🚀 IMMEDIATE: Setting up logout button');
        logoutBtn.onclick = function(e) {
            console.log('🔥 LOGOUT CLICK: Logout button clicked!');
            e.preventDefault();
            e.stopPropagation();
            
            if (confirm('Are you sure you want to log out?')) {
                console.log('🚪 User confirmed logout');
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
            } else {
                console.log('🚫 User cancelled logout');
            }
        };
        console.log('✅ IMMEDIATE: Logout button setup complete');
    } else {
        console.log('❌ IMMEDIATE: Logout button not found');
    }
    
    console.log('🚀 IMMEDIATE: Setup complete!');
}


// Run fallback setup when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDropdownFallback);
} else {
    setupDropdownFallback();
}

// Additional functionality that was in inline scripts
function updateGrowthIndicators() {
    console.log('🔧 INLINE FIX: Updating growth indicators immediately...');
    
    // Update all growth indicators immediately after HTML is loaded
    const updates = [
        ['totalEmployeesGrowth', 'No change'],
        ['activeEmployeesGrowth', 'No change'],
        ['departmentsGrowth', 'No change'],
        ['attendanceRateGrowth', 'No change']
    ];
    
    updates.forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`📊 Updating ${id} to: ${text}`);
            element.textContent = text;
            element.className = 'stat-change neutral';
        }
    });
}

function updateActivityFeed() {
    console.log('🔧 ACTIVITY FIX: Ensuring no-data state is visible...');
    
    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed && activityFeed.children.length === 0) {
        console.log('🔧 ACTIVITY FIX: Activity feed is empty, adding no-data state');
        activityFeed.innerHTML = `
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
    } else if (activityFeed) {
        console.log('🔧 ACTIVITY FIX: Activity feed has content:', activityFeed.children.length, 'elements');
    } else {
        console.log('❌ ACTIVITY FIX: Activity feed element not found');
    }
}

function forceUpdateGrowthIndicators() {
    const growthIds = ['totalEmployeesGrowth', 'activeEmployeesGrowth', 'departmentsGrowth', 'attendanceRateGrowth'];
    let updated = 0;
    
    growthIds.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.textContent === 'Loading...') {
            console.log(`🔄 FORCE UPDATE: ${id} from "Loading..." to "No change"`);
            element.textContent = 'No change';
            element.className = 'stat-change neutral';
            updated++;
        }
    });
    
    if (updated > 0) {
        console.log(`✅ FORCE UPDATE: Updated ${updated} loading indicators`);
    }
}

function forceUpdateUserProfile() {
    console.log('👤 IMMEDIATE FIX: Updating user profile from localStorage...');
    
    try {
        const cachedProfile = localStorage.getItem('profile');
        if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile);
            const profileData = parsed.profile || parsed;
            
            const userNameEls = document.querySelectorAll('.user-name');
            const userRoleEls = document.querySelectorAll('.user-role');
            const userEmailEls = document.querySelectorAll('.user-email');
            
            const fullName = `${profileData.first_name || 'User'} ${profileData.last_name || ''}`.trim();
            const email = profileData.email || 'user@example.com';
            const role = profileData.role === 'super_admin' ? 'Super Admin' : (profileData.role || 'User');
            
            let updated = 0;
            
            userNameEls.forEach(el => {
                if (el.textContent === 'Loading...') {
                    console.log(`👤 FORCE UPDATE: User name to "${fullName}"`);
                    el.textContent = fullName;
                    updated++;
                }
            });
            
            userRoleEls.forEach(el => {
                if (el.textContent === 'Loading...') {
                    console.log(`🎭 FORCE UPDATE: User role to "${role}"`);
                    el.textContent = role;
                    updated++;
                }
            });
            
            userEmailEls.forEach(el => {
                if (el.textContent === 'Loading...') {
                    console.log(`📧 FORCE UPDATE: User email to "${email}"`);
                    el.textContent = email;
                    updated++;
                }
            });
            
            if (updated > 0) {
                console.log(`✅ FORCE UPDATE: Updated ${updated} user profile elements`);
            }
        } else {
            console.log('⚠️ No cached profile found for immediate update');
        }
    } catch (error) {
        console.error('❌ Error updating user profile immediately:', error);
    }
}

// Run updates when DOM is ready
function runImmediateFixes() {
    console.log('🔄 IMMEDIATE FIX: Force clearing loading states...');
    
    updateGrowthIndicators();
    updateActivityFeed();
    forceUpdateGrowthIndicators();
    forceUpdateUserProfile();
    
    // Run multiple times to ensure it works
    setTimeout(() => {
        forceUpdateGrowthIndicators();
        forceUpdateUserProfile();
    }, 100);
    setTimeout(() => {
        forceUpdateGrowthIndicators();
        forceUpdateUserProfile();
    }, 500);
    setTimeout(() => {
        forceUpdateGrowthIndicators();
        forceUpdateUserProfile();
    }, 1000);
    setTimeout(() => {
        forceUpdateGrowthIndicators();
        forceUpdateUserProfile();
    }, 2000);
}

// Run fixes when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runImmediateFixes);
} else {
    runImmediateFixes();
}

console.log('✅ GLOBAL dropdown functions and fixes loaded in external file');
