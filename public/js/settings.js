// Settings Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
});

function initializeSettings() {
    // Initialize tab navigation
    initializeTabs();
    
    // Initialize form handlers
    initializeFormHandlers();
    
    // Initialize password strength checker
    initializePasswordStrength();
    
    // Initialize avatar upload
    initializeAvatarUpload();
    
    // Initialize theme selection
    initializeThemeSelection();
    
    // Initialize save functionality
    initializeSaveFunctionality();
    
    // Initialize notification toggles
    initializeNotificationToggles();
}

// Tab Navigation
function initializeTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const panels = document.querySelectorAll('.settings-panel');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Update URL hash
            window.location.hash = targetTab;
        });
    });
    
    // Check for hash on page load
    if (window.location.hash) {
        const targetTab = window.location.hash.substring(1);
        const tab = document.querySelector(`[data-tab="${targetTab}"]`);
        if (tab) {
            tab.click();
        }
    }
}

// Form Handlers
function initializeFormHandlers() {
    // Profile form
    const profileForm = document.querySelector('#profile');
    if (profileForm) {
        const inputs = profileForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                markFormAsChanged(profileForm);
            });
        });
    }
    
    // Security form
    const securityForm = document.querySelector('#security');
    if (securityForm) {
        const inputs = securityForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                markFormAsChanged(securityForm);
            });
        });
    }
}

function markFormAsChanged(form) {
    form.classList.add('has-changes');
    updateSaveButton();
}

function updateSaveButton() {
    const saveBtn = document.getElementById('saveAllBtn');
    const hasChanges = document.querySelectorAll('.has-changes').length > 0;
    
    if (hasChanges) {
        saveBtn.classList.add('has-changes');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    } else {
        saveBtn.classList.remove('has-changes');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
    }
}

// Password Strength Checker
function initializePasswordStrength() {
    const passwordInput = document.getElementById('newPassword');
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthBar && strengthText) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = calculatePasswordStrength(password);
            updatePasswordStrength(strength, strengthBar, strengthText);
        });
    }
}

function calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (password.match(/[a-z]/)) score += 1;
    if (password.match(/[A-Z]/)) score += 1;
    if (password.match(/[0-9]/)) score += 1;
    if (password.match(/[^a-zA-Z0-9]/)) score += 1;
    
    if (score < 2) return { level: 'weak', percentage: 25 };
    if (score < 3) return { level: 'fair', percentage: 50 };
    if (score < 4) return { level: 'good', percentage: 75 };
    return { level: 'strong', percentage: 100 };
}

function updatePasswordStrength(strength, strengthBar, strengthText) {
    strengthBar.style.width = strength.percentage + '%';
    strengthBar.className = 'strength-fill ' + strength.level;
    
    const messages = {
        weak: 'Weak password',
        fair: 'Fair password',
        good: 'Good password',
        strong: 'Strong password'
    };
    
    strengthText.textContent = messages[strength.level];
}

// Avatar Upload
function initializeAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        avatarPreview.src = e.target.result;
                        markFormAsChanged(document.querySelector('#profile'));
                    };
                    reader.readAsDataURL(file);
                } else {
                    showNotification('Please select a valid image file', 'error');
                }
            }
        });
        
        // Click avatar to trigger file input
        avatarPreview.addEventListener('click', () => {
            avatarInput.click();
        });
    }
}

// Theme Selection
function initializeThemeSelection() {
    const themeCards = document.querySelectorAll('.theme-card');
    
    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active class from all cards
            themeCards.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked card
            card.classList.add('active');
            
            // Get selected theme
            const theme = card.dataset.theme;
            
            // Apply theme (you can implement theme switching logic here)
            applyTheme(theme);
            
            // Mark as changed
            markFormAsChanged(document.querySelector('#appearance'));
        });
    });
}

function applyTheme(theme) {
    // Store theme preference
    localStorage.setItem('theme', theme);
    
    // Apply theme to body
    document.body.className = `dashboard-bg theme-${theme}`;
    
    showNotification(`Theme changed to ${theme}`, 'success');
}

// Save Functionality
function initializeSaveFunctionality() {
    const saveBtn = document.getElementById('saveAllBtn');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveAllChanges();
        });
    }
}

function saveAllChanges() {
    const saveBtn = document.getElementById('saveAllBtn');
    const originalText = saveBtn.innerHTML;
    
    // Show loading state
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    // Simulate save operation
    setTimeout(() => {
        // Collect all form data
        const formData = collectFormData();
        
        // Here you would typically send the data to your backend
        console.log('Saving form data:', formData);
        
        // Show success message
        showNotification('Settings saved successfully!', 'success');
        
        // Reset form states
        document.querySelectorAll('.has-changes').forEach(form => {
            form.classList.remove('has-changes');
        });
        
        // Reset save button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        updateSaveButton();
        
    }, 1500);
}

function collectFormData() {
    const data = {};
    
    // Profile data
    const profileInputs = document.querySelectorAll('#profile input, #profile select, #profile textarea');
    profileInputs.forEach(input => {
        if (input.id) {
            data[input.id] = input.value;
        }
    });
    
    // Security data
    const securityInputs = document.querySelectorAll('#security input');
    securityInputs.forEach(input => {
        if (input.id) {
            data[input.id] = input.value;
        }
    });
    
    // Notification settings
    const notificationToggles = document.querySelectorAll('#notifications input[type="checkbox"]');
    notificationToggles.forEach(toggle => {
        data[toggle.id || toggle.name] = toggle.checked;
    });
    
    // Appearance settings
    const appearanceInputs = document.querySelectorAll('#appearance select');
    appearanceInputs.forEach(input => {
        if (input.id) {
            data[input.id] = input.value;
        }
    });
    
    return data;
}

// Notification Toggles
function initializeNotificationToggles() {
    const toggles = document.querySelectorAll('.toggle-switch input');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const notificationItem = toggle.closest('.notification-item');
            if (notificationItem) {
                markFormAsChanged(document.querySelector('#notifications'));
            }
        });
    });
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.2s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }
    
    .btn.has-changes {
        background: linear-gradient(135deg, #10b981, #059669);
        animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        }
        50% {
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
        }
    }
`;
document.head.appendChild(style);

// Session Management
function revokeSession(sessionId) {
    if (confirm('Are you sure you want to revoke this session?')) {
        // Here you would typically make an API call to revoke the session
        console.log('Revoking session:', sessionId);
        
        // Remove the session item from DOM
        const sessionItem = document.querySelector(`[data-session-id="${sessionId}"]`);
        if (sessionItem) {
            sessionItem.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => sessionItem.remove(), 300);
        }
        
        showNotification('Session revoked successfully', 'success');
    }
}

// Department Management
function deleteDepartment(departmentId) {
    if (confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
        // Here you would typically make an API call to delete the department
        console.log('Deleting department:', departmentId);
        
        // Remove the department item from DOM
        const departmentItem = document.querySelector(`[data-department-id="${departmentId}"]`);
        if (departmentItem) {
            departmentItem.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => departmentItem.remove(), 300);
        }
        
        showNotification('Department deleted successfully', 'success');
    }
}

// Integration Management
function connectIntegration(integrationName) {
    // Here you would typically redirect to the integration's OAuth flow
    console.log('Connecting to:', integrationName);
    
    // Simulate connection process
    showNotification(`Connecting to ${integrationName}...`, 'info');
    
    setTimeout(() => {
        showNotification(`Successfully connected to ${integrationName}!`, 'success');
        // Update the integration card to show connected state
        const integrationCard = document.querySelector(`[data-integration="${integrationName}"]`);
        if (integrationCard) {
            integrationCard.classList.add('connected');
        }
    }, 2000);
}

function disconnectIntegration(integrationName) {
    if (confirm(`Are you sure you want to disconnect from ${integrationName}?`)) {
        // Here you would typically make an API call to disconnect
        console.log('Disconnecting from:', integrationName);
        
        showNotification(`Disconnected from ${integrationName}`, 'success');
        
        // Update the integration card to show disconnected state
        const integrationCard = document.querySelector(`[data-integration="${integrationName}"]`);
        if (integrationCard) {
            integrationCard.classList.remove('connected');
        }
    }
}

// Add fadeOut animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(fadeOutStyle); 