// Settings Page JavaScript - Real Data Integration

class SettingsManager {
    constructor() {
        this.currentUser = null;
        this.isLoading = false;
        this.hasChanges = false;
        this.mockSessionData = null; // For demo purposes
        this.initializeSettings();
    }

    async initializeSettings() {
        console.log('🚀 Initializing Settings Manager...');
        
        // Wait for shared EmployeeHub to be ready if it exists
        await this.waitForSharedInstance();
        
        try {
            // Load user profile first
            await this.loadUserProfile();
            
            // Initialize all components
            this.initializeTabs();
            this.initializeFormHandlers();
            this.initializePasswordStrength();
            this.initializeAvatarUpload();
            this.initializeThemeSelection();
            this.initializeSaveFunctionality();
            this.initializeNotificationToggles();
            this.initializeSystemSettings();
            
            // Load all data
            await this.loadAllSettingsData();
            
            console.log('✅ Settings Manager initialized successfully');
        } catch (error) {
            console.error('❌ Settings initialization failed:', error);
            this.showError('Failed to load settings. Please refresh the page.');
        }
    }

    async waitForSharedInstance() {
        // Wait for shared EmployeeHub instance to be available
        const maxWait = 5000; // 5 seconds
        const startTime = Date.now();
        
        while (!window.EmployeeHub && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (window.EmployeeHub) {
            console.log('✅ Shared EmployeeHub instance found');
            // If shared instance already has user data, use it
            if (window.EmployeeHub.currentUser) {
                this.currentUser = window.EmployeeHub.currentUser;
                console.log('✅ Using user data from shared instance:', this.currentUser);
            }
        }
    }

    showLoadingState() {
        // Don't interfere with sidebar elements - let shared.js handle those
        // Only show loading for settings-specific elements
        console.log('📄 Settings page loading...');
    }

    hideLoadingState() {
        // Loading is handled by individual data loading functions
    }

    async loadUserProfile() {
        try {
            console.log('📡 Loading user profile...');
            
            // If we already have user data from shared instance, use it
            if (this.currentUser) {
                console.log('✅ Using existing user data');
                this.updateProfileUI();
                return;
            }
            
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Profile fetch failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Extract profile data (handle nested structure)
            this.currentUser = data.profile || data.user || data;
            
            console.log('✅ User profile loaded:', this.currentUser);
            
            // Update profile information in the UI
            this.updateProfileUI();
            
        } catch (error) {
            console.error('❌ Failed to load user profile:', error);
            throw error;
        }
    }

    updateProfileUI() {
        if (!this.currentUser) return;

        // Only update profile form fields, not sidebar elements
        // Sidebar elements are handled by shared.js
        
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const bioInput = document.getElementById('bio');
        const avatarPreview = document.getElementById('avatarPreview');

        if (firstNameInput) firstNameInput.value = this.currentUser.first_name || '';
        if (lastNameInput) lastNameInput.value = this.currentUser.last_name || '';
        if (emailInput) emailInput.value = this.currentUser.email || '';
        if (phoneInput) phoneInput.value = this.currentUser.phone || '';
        if (bioInput) bioInput.value = this.currentUser.bio || '';
        
        // Update avatar preview
        if (avatarPreview) {
            const initials = this.getInitials(this.currentUser.first_name, this.currentUser.last_name);
            avatarPreview.textContent = initials;
        }

        // Update role badge
        this.updateRoleBadge();
        
        // Setup role-based UI
        this.setupRoleBasedUI();
    }

    setupRoleBasedUI() {
        const isSuperAdmin = this.currentUser?.role === 'super_admin';
        
        // Update payment section
        const paymentDescription = document.getElementById('payment-description');
        const superAdminPayment = document.getElementById('super-admin-payment');
        const userPayment = document.getElementById('user-payment');
        
        if (isSuperAdmin) {
            if (paymentDescription) paymentDescription.textContent = 'Configure payment gateway and organization bank account details';
            if (superAdminPayment) superAdminPayment.style.display = 'block';
            if (userPayment) userPayment.style.display = 'none';
        } else {
            if (paymentDescription) paymentDescription.textContent = 'Configure your personal payment settings and IBAN';
            if (superAdminPayment) superAdminPayment.style.display = 'none';
            if (userPayment) userPayment.style.display = 'block';
        }
        
        // Update system section
        const systemDescription = document.getElementById('system-description');
        const superAdminSystem = document.getElementById('super-admin-system');
        const userSystem = document.getElementById('user-system');
        
        if (isSuperAdmin) {
            if (systemDescription) systemDescription.textContent = 'Configure platform-wide settings and preferences';
            if (superAdminSystem) superAdminSystem.style.display = 'block';
            if (userSystem) userSystem.style.display = 'none';
        } else {
            if (systemDescription) systemDescription.textContent = 'View your account information and preferences';
            if (superAdminSystem) superAdminSystem.style.display = 'none';
            if (userSystem) userSystem.style.display = 'block';
            
            // Populate user system info
            this.populateUserSystemInfo();
        }
        
        // Update advanced section
        const advancedDescription = document.getElementById('advanced-description');
        const superAdminAdvanced = document.getElementById('super-admin-advanced');
        const userAdvanced = document.getElementById('user-advanced');
        
        if (isSuperAdmin) {
            if (advancedDescription) advancedDescription.textContent = 'Advanced configuration options and developer settings';
            if (superAdminAdvanced) superAdminAdvanced.style.display = 'block';
            if (userAdvanced) userAdvanced.style.display = 'none';
        } else {
            if (advancedDescription) advancedDescription.textContent = 'Account management and personal preferences';
            if (superAdminAdvanced) superAdminAdvanced.style.display = 'none';
            if (userAdvanced) userAdvanced.style.display = 'block';
            
            // Load user advanced settings
            this.loadUserAdvancedSettings();
        }
    }

    populateUserSystemInfo() {
        if (!this.currentUser) return;
        
        const roleDisplay = document.getElementById('user-role-display');
        const statusDisplay = document.getElementById('user-status-display');
        const createdDisplay = document.getElementById('user-created-display');
        
        if (roleDisplay) {
            roleDisplay.textContent = this.formatRole(this.currentUser.role);
        }
        
        if (statusDisplay) {
            statusDisplay.textContent = this.currentUser.is_active ? 'Active' : 'Inactive';
            statusDisplay.className = `info-value ${this.currentUser.is_active ? 'status-active' : 'status-inactive'}`;
        }
        
        if (createdDisplay && this.currentUser.created_at) {
            const createdDate = new Date(this.currentUser.created_at);
            createdDisplay.textContent = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    updateRoleBadge() {
        const roleBadge = document.querySelector('.role-badge');
        if (roleBadge && this.currentUser) {
            const role = this.currentUser.role;
            
            // Update badge content
            const roleText = this.formatRole(role);
            roleBadge.innerHTML = `<i class="fas fa-crown"></i> ${roleText}`;
            
            // Update badge class based on role
            roleBadge.className = `role-badge ${role.replace('_', '-')}`;
        }
    }

    formatRole(role) {
        const roleMap = {
            'super_admin': 'Super Administrator',
            'admin': 'Administrator',
            'manager': 'Manager',
            'employee': 'Employee',
            'organization_member': 'Organization Member'
        };
        return roleMap[role] || role;
    }

    getInitials(firstName, lastName) {
        const first = (firstName || '').charAt(0).toUpperCase();
        const last = (lastName || '').charAt(0).toUpperCase();
        return first + last || 'U';
    }

    async loadAllSettingsData() {
        try {
            // Load data in parallel
            await Promise.all([
                this.loadNotificationSettings(),
                this.loadSystemSettings(),
                this.loadSecuritySettings(),
                this.loadSessionData(),
                this.loadPaymentSettings()
            ]);
        } catch (error) {
            console.error('❌ Failed to load some settings data:', error);
        }
    }

    async loadNotificationSettings() {
        try {
            // For now, use localStorage or set defaults
            // In a real app, this would come from the database
            const saved = localStorage.getItem('notificationSettings');
            const settings = saved ? JSON.parse(saved) : {
                systemAlerts: true,
                userActivity: true,
                securityEvents: true,
                weeklyReports: false,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00'
            };

            // Update UI
            Object.keys(settings).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = settings[key];
                    } else {
                        element.value = settings[key];
                    }
                }
            });

        } catch (error) {
            console.error('❌ Failed to load notification settings:', error);
        }
    }

    async loadSystemSettings() {
        try {
            // Load system configuration (super admin only)
            if (this.currentUser?.role === 'super_admin') {
                const settings = {
                    platformName: 'Chronos HR',
                    supportEmail: 'support@chronoshr.com',
                    maxUsers: 1000,
                    sessionTimeout: 60,
                    allowSelfRegistration: false,
                    requireEmailVerification: true,
                    requireAdminApproval: true
                };

                // Update UI
                Object.keys(settings).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        if (element.type === 'checkbox') {
                            element.checked = settings[key];
                        } else {
                            element.value = settings[key];
                        }
                    }
                });
            }
        } catch (error) {
            console.error('❌ Failed to load system settings:', error);
        }
    }

    async loadSecuritySettings() {
        try {
            // Load security settings from localStorage or defaults
            const settings = {
                twoFactorAuth: false,
                sidebarAutoHide: true,
                compactMode: false
            };

            Object.keys(settings).forEach(key => {
                const element = document.getElementById(key);
                if (element && element.type === 'checkbox') {
                    element.checked = settings[key];
                }
            });

        } catch (error) {
            console.error('❌ Failed to load security settings:', error);
        }
    }

    async loadSessionData() {
        try {
            // Mock session data for demo (in real app, this would come from backend)
            this.mockSessionData = [
                {
                    id: 'current',
                    device: 'MacBook Pro',
                    location: 'San Francisco, CA',
                    lastActive: 'Active now',
                    isCurrent: true
                }
            ];

            this.updateSessionList();

        } catch (error) {
            console.error('❌ Failed to load session data:', error);
        }
    }

    async loadPaymentSettings() {
        try {
            console.log('💰 Loading payment settings...');
            
            const isSuperAdmin = this.currentUser?.role === 'super_admin';
            
            if (isSuperAdmin) {
                // Load organization payment settings for super admin
                const ibanInput = document.getElementById('iban');
                const bankNameInput = document.getElementById('bankName');
                const accountNumberInput = document.getElementById('accountNumber');
                const routingNumberInput = document.getElementById('routingNumber');
                
                if (this.currentUser) {
                    if (ibanInput) ibanInput.value = this.currentUser.iban || '';
                    if (bankNameInput) bankNameInput.value = this.currentUser.bank_name || '';
                    if (accountNumberInput) accountNumberInput.value = this.currentUser.account_number || '';
                    if (routingNumberInput) routingNumberInput.value = this.currentUser.routing_number || '';
                }
                
                // Load Stripe settings from localStorage (in production, this would come from database)
                const stripeEnabled = document.getElementById('stripeEnabled');
                const stripeApiKey = document.getElementById('stripeApiKey');
                
                if (stripeEnabled) {
                    stripeEnabled.checked = localStorage.getItem('stripeEnabled') === 'true';
                }
                
                if (stripeApiKey) {
                    stripeApiKey.value = localStorage.getItem('stripeApiKey') || '';
                }
            } else {
                // Load personal payment settings for regular users
                const userIbanInput = document.getElementById('userIban');
                const userBankNameInput = document.getElementById('userBankName');
                const userAccountHolderInput = document.getElementById('userAccountHolder');
                const userPhoneInput = document.getElementById('userPhone');
                const preferredPaymentMethod = document.getElementById('preferredPaymentMethod');
                const paymentNotifications = document.getElementById('paymentNotifications');
                
                if (this.currentUser) {
                    if (userIbanInput) userIbanInput.value = this.currentUser.iban || '';
                    if (userBankNameInput) userBankNameInput.value = this.currentUser.bank_name || '';
                    if (userAccountHolderInput) userAccountHolderInput.value = this.currentUser.account_holder_name || '';
                    if (userPhoneInput) userPhoneInput.value = this.currentUser.phone || '';
                }
                
                // Load user preferences from localStorage
                if (preferredPaymentMethod) {
                    preferredPaymentMethod.value = localStorage.getItem('preferredPaymentMethod') || 'iban';
                }
                
                if (paymentNotifications) {
                    paymentNotifications.checked = localStorage.getItem('paymentNotifications') !== 'false';
                }
                
                // Initialize IBAN validation for user IBAN
                this.initializeIBANValidation('userIban');
            }
            
            console.log('✅ Payment settings loaded');
        } catch (error) {
            console.error('❌ Failed to load payment settings:', error);
        }
    }

    initializeIBANValidation(inputId = 'iban') {
        const ibanInput = document.getElementById(inputId);
        if (!ibanInput) return;
        
        ibanInput.addEventListener('input', (e) => {
            const iban = e.target.value.toUpperCase().replace(/\s/g, '');
            e.target.value = iban;
            
            // Validate IBAN format
            const isValid = this.validateIBAN(iban);
            
            if (iban && !isValid) {
                ibanInput.classList.add('error');
                this.showNotification('Invalid IBAN format', 'error');
            } else {
                ibanInput.classList.remove('error');
            }
        });
        
        ibanInput.addEventListener('blur', (e) => {
            const iban = e.target.value;
            if (iban && !this.validateIBAN(iban)) {
                this.showNotification('Please enter a valid IBAN', 'error');
            }
        });
    }

    validateIBAN(iban) {
        if (!iban) return true; // Empty is valid
        
        // Basic IBAN validation
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/;
        return ibanRegex.test(iban);
    }

    async savePaymentSettings() {
        try {
            console.log('💰 Saving payment settings...');
            
            const isSuperAdmin = this.currentUser?.role === 'super_admin';
            
            if (isSuperAdmin) {
                // Save organization payment settings for super admin
                const paymentData = {
                    iban: document.getElementById('iban')?.value || '',
                    bank_name: document.getElementById('bankName')?.value || '',
                    account_number: document.getElementById('accountNumber')?.value || '',
                    routing_number: document.getElementById('routingNumber')?.value || '',
                    stripe_enabled: document.getElementById('stripeEnabled')?.checked || false,
                    stripe_api_key: document.getElementById('stripeApiKey')?.value || ''
                };
                
                // Validate IBAN if provided
                if (paymentData.iban && !this.validateIBAN(paymentData.iban)) {
                    throw new Error('Invalid IBAN format');
                }
                
                // Save to database via API
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/update-payment-settings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(paymentData)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to save payment settings');
                }
                
                // Save Stripe settings to localStorage (in production, this would be in database)
                localStorage.setItem('stripeEnabled', paymentData.stripe_enabled);
                localStorage.setItem('stripeApiKey', paymentData.stripe_api_key);
                
            } else {
                // Save personal payment settings for regular users
                const paymentData = {
                    iban: document.getElementById('userIban')?.value || '',
                    bank_name: document.getElementById('userBankName')?.value || '',
                    account_holder_name: document.getElementById('userAccountHolder')?.value || '',
                    phone: document.getElementById('userPhone')?.value || ''
                };
                
                // Validate IBAN if provided
                if (paymentData.iban && !this.validateIBAN(paymentData.iban)) {
                    throw new Error('Invalid IBAN format');
                }
                
                // Save to database via API
                const token = localStorage.getItem('token');
                const response = await fetch('/api/auth/update-payment-settings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(paymentData)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to save payment settings');
                }
                
                // Save user preferences to localStorage
                const preferredPaymentMethod = document.getElementById('preferredPaymentMethod')?.value || 'iban';
                const paymentNotifications = document.getElementById('paymentNotifications')?.checked || false;
                
                localStorage.setItem('preferredPaymentMethod', preferredPaymentMethod);
                localStorage.setItem('paymentNotifications', paymentNotifications);
            }
            
            this.showNotification('Payment settings saved successfully', 'success');
            console.log('✅ Payment settings saved');
            
        } catch (error) {
            console.error('❌ Failed to save payment settings:', error);
            this.showNotification(error.message, 'error');
        }
    }

    updateSessionList() {
        const sessionList = document.querySelector('.session-list');
        if (!sessionList || !this.mockSessionData) return;

        sessionList.innerHTML = this.mockSessionData.map(session => `
            <div class="session-item ${session.isCurrent ? 'current' : ''}">
                <div class="session-info">
                    <div class="session-device">
                        <i class="fas fa-${session.device.toLowerCase().includes('phone') ? 'mobile-alt' : 'laptop'}"></i>
                        <span>${session.isCurrent ? 'Current Session - ' : ''}${session.device}</span>
                    </div>
                    <div class="session-details">
                        <span class="session-location">${session.location}</span>
                        <span class="session-time">${session.lastActive}</span>
                    </div>
                </div>
                <div class="session-actions">
                    ${session.isCurrent ? 
                        '<span class="current-badge">Current</span>' : 
                        '<button class="btn btn-sm btn-danger" onclick="settingsManager.revokeSession(\'' + session.id + '\')">Revoke</button>'
                    }
                </div>
            </div>
        `).join('');
    }

    // Tab Navigation
    initializeTabs() {
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
                const targetPanel = document.getElementById(targetTab);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
                
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
    initializeFormHandlers() {
        // Profile form
        const profileInputs = document.querySelectorAll('#profile input, #profile select, #profile textarea');
        profileInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.markFormAsChanged();
            });
        });
        
        // Security form
        const securityInputs = document.querySelectorAll('#security input');
        securityInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.markFormAsChanged();
            });
        });

        // System form (super admin only)
        const systemInputs = document.querySelectorAll('#system input, #system select');
        systemInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.markFormAsChanged();
            });
        });

        // Notification form
        const notificationInputs = document.querySelectorAll('#notifications input');
        notificationInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.markFormAsChanged();
            });
        });
    }

    markFormAsChanged() {
        this.hasChanges = true;
        this.updateSaveButton();
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveAllBtn');
        if (!saveBtn) return;
        
        if (this.hasChanges) {
            saveBtn.classList.add('has-changes');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            saveBtn.disabled = false;
        } else {
            saveBtn.classList.remove('has-changes');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            saveBtn.disabled = false;
        }
    }

    // Password Strength Checker
    initializePasswordStrength() {
        const passwordInput = document.getElementById('newPassword');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                const password = passwordInput.value;
                const strength = this.calculatePasswordStrength(password);
                this.updatePasswordStrength(strength);
            });
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score += 1;
        if (password.match(/[a-z]/)) score += 1;
        if (password.match(/[A-Z]/)) score += 1;
        if (password.match(/[0-9]/)) score += 1;
        if (password.match(/[^a-zA-Z0-9]/)) score += 1;
        
        if (score < 2) return { level: 'weak', percentage: 25, color: '#ef4444' };
        if (score < 3) return { level: 'fair', percentage: 50, color: '#f59e0b' };
        if (score < 4) return { level: 'good', percentage: 75, color: '#10b981' };
        return { level: 'strong', percentage: 100, color: '#059669' };
    }

    updatePasswordStrength(strength) {
        // Create strength indicator if it doesn't exist
        const passwordInput = document.getElementById('newPassword');
        if (!passwordInput) return;

        let strengthContainer = passwordInput.parentNode.querySelector('.password-strength');
        if (!strengthContainer) {
            strengthContainer = document.createElement('div');
            strengthContainer.className = 'password-strength';
            strengthContainer.innerHTML = `
                <div class="strength-bar">
                    <div class="strength-fill"></div>
                </div>
                <span class="strength-text">Enter a password</span>
            `;
            passwordInput.parentNode.appendChild(strengthContainer);
        }

        const strengthBar = strengthContainer.querySelector('.strength-fill');
        const strengthText = strengthContainer.querySelector('.strength-text');

        if (strengthBar && strengthText) {
            strengthBar.style.width = strength.percentage + '%';
            strengthBar.style.backgroundColor = strength.color;
            
            const messages = {
                weak: 'Weak password',
                fair: 'Fair password',
                good: 'Good password',
                strong: 'Strong password'
            };
            
            strengthText.textContent = messages[strength.level];
            strengthText.style.color = strength.color;
        }
    }

    // Avatar Upload
    initializeAvatarUpload() {
        const avatarInput = document.getElementById('avatarInput');
        const avatarPreview = document.getElementById('avatarPreview');
        
        if (avatarInput && avatarPreview) {
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            // For now, just show initials since we don't have image upload backend
                            this.showNotification('Avatar upload functionality will be available soon', 'info');
                            this.markFormAsChanged();
                        };
                        reader.readAsDataURL(file);
                    } else {
                        this.showNotification('Please select a valid image file', 'error');
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
    initializeThemeSelection() {
        const themeOptions = document.querySelectorAll('.theme-option');
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        themeOptions.forEach(option => {
            if (option.dataset.theme === savedTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove active class from all options
                themeOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                option.classList.add('active');
                
                // Get selected theme
                const theme = option.dataset.theme;
                
                // Apply theme
                this.applyTheme(theme);
                
                // Mark as changed
                this.markFormAsChanged();
            });
        });
    }

    applyTheme(theme) {
        // Store theme preference
        localStorage.setItem('theme', theme);
        
        // Apply theme to body (you can implement actual theme switching here)
        document.body.setAttribute('data-theme', theme);
        
        this.showNotification(`Theme changed to ${theme}`, 'success');
    }

    // Save Functionality
    initializeSaveFunctionality() {
        const saveBtn = document.getElementById('saveAllBtn');
        const discardBtn = document.getElementById('discardChanges');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveAllChanges();
            });
        }

        if (discardBtn) {
            discardBtn.addEventListener('click', () => {
                this.discardChanges();
            });
        }
    }

    async saveAllChanges() {
        if (this.isLoading) return;
        
        const saveBtn = document.getElementById('saveAllBtn');
        const originalText = saveBtn.innerHTML;
        
        this.isLoading = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            // Collect form data
            const formData = this.collectFormData();
            console.log('💾 Saving form data:', formData);

            // Save profile data
            if (formData.profile && Object.keys(formData.profile).length > 0) {
                await this.saveProfileData(formData.profile);
            }

            // Save notification settings
            if (formData.notifications) {
                this.saveNotificationSettings(formData.notifications);
            }

            // Save system settings (super admin only)
            if (formData.system && this.currentUser?.role === 'super_admin') {
                this.saveSystemSettings(formData.system);
            }

            // Save security settings
            if (formData.security) {
                this.saveSecuritySettings(formData.security);
            }

            // Save payment settings
            if (formData.payment) {
                await this.savePaymentSettings();
            }

            this.showNotification('Settings saved successfully!', 'success');
            this.hasChanges = false;
            this.updateSaveButton();
            
        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showNotification('Failed to save settings. Please try again.', 'error');
        } finally {
            this.isLoading = false;
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    async saveProfileData(profileData) {
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        const result = await response.json();
        console.log('✅ Profile updated:', result);
        
        // Update current user data
        if (result.profile) {
            this.currentUser = { ...this.currentUser, ...result.profile };
            this.updateProfileUI();
        }
    }

    saveNotificationSettings(settings) {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        console.log('✅ Notification settings saved');
    }

    saveSystemSettings(settings) {
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        console.log('✅ System settings saved');
    }

    saveSecuritySettings(settings) {
        localStorage.setItem('securitySettings', JSON.stringify(settings));
        console.log('✅ Security settings saved');
    }

    discardChanges() {
        if (confirm('Are you sure you want to discard all changes?')) {
            // Reload the page to reset all changes
            window.location.reload();
        }
    }

    collectFormData() {
        const data = {
            profile: {},
            notifications: {},
            system: {},
            security: {},
            appearance: {},
            payment: {},
            advanced: {}
        };
        
        const isSuperAdmin = this.currentUser?.role === 'super_admin';
        
        // Profile data
        const profileInputs = document.querySelectorAll('#profile input, #profile select, #profile textarea');
        profileInputs.forEach(input => {
            if (input.id && input.value !== '') {
                const key = input.id;
                if (['firstName', 'lastName', 'email', 'phone', 'bio'].includes(key)) {
                    data.profile[key === 'firstName' ? 'first_name' : 
                                  key === 'lastName' ? 'last_name' : key] = input.value;
                }
            }
        });
        
        // Notification settings
        const notificationInputs = document.querySelectorAll('#notifications input');
        notificationInputs.forEach(input => {
            if (input.id) {
                data.notifications[input.id] = input.type === 'checkbox' ? input.checked : input.value;
            }
        });
        
        // System settings (super admin only)
        if (isSuperAdmin) {
            const systemInputs = document.querySelectorAll('#system input, #system select');
            systemInputs.forEach(input => {
                if (input.id) {
                    data.system[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
        } else {
            // User preferences for regular users
            const userPreferences = document.querySelectorAll('#user-system input, #user-system select');
            userPreferences.forEach(input => {
                if (input.id) {
                    data.system[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
        }
        
        // Security settings
        const securityInputs = document.querySelectorAll('#security input[type="checkbox"]');
        securityInputs.forEach(input => {
            if (input.id) {
                data.security[input.id] = input.checked;
            }
        });
        
        // Payment settings
        if (isSuperAdmin) {
            // Super admin payment settings
            const paymentInputs = document.querySelectorAll('#super-admin-payment input, #super-admin-payment select');
            paymentInputs.forEach(input => {
                if (input.id) {
                    data.payment[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
        } else {
            // Regular user payment settings
            const paymentInputs = document.querySelectorAll('#user-payment input, #user-payment select');
            paymentInputs.forEach(input => {
                if (input.id) {
                    data.payment[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
        }
        
        // Advanced settings
        if (isSuperAdmin) {
            // Super admin advanced settings
            const advancedInputs = document.querySelectorAll('#super-admin-advanced input, #super-admin-advanced select');
            advancedInputs.forEach(input => {
                if (input.id) {
                    data.advanced[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
        } else {
            // Regular user advanced settings
            const advancedInputs = document.querySelectorAll('#user-advanced input, #user-advanced select');
            advancedInputs.forEach(input => {
                if (input.id) {
                    data.advanced[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
        }
        
        return data;
    }

    // Notification Toggles
    initializeNotificationToggles() {
        const toggles = document.querySelectorAll('.toggle-switch input');
        
        toggles.forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.markFormAsChanged();
            });
        });
    }

    // System Settings
    initializeSystemSettings() {
        // Initialize developer options
        const devOptions = document.querySelectorAll('#advanced input[type="checkbox"]');
        devOptions.forEach(option => {
            option.addEventListener('change', () => {
                const isEnabled = option.checked;
                const optionName = option.id;
                
                if (optionName === 'maintenanceMode' && isEnabled) {
                    if (!confirm('Are you sure you want to enable maintenance mode? This will make the platform unavailable to users.')) {
                        option.checked = false;
                        return;
                    }
                }
                
                this.markFormAsChanged();
            });
        });

        // Initialize danger zone actions
        const resetPlatformBtn = document.querySelector('.danger-action button');
        if (resetPlatformBtn) {
            resetPlatformBtn.addEventListener('click', () => {
                this.handleDangerousAction('reset');
            });
        }
    }

    handleDangerousAction(action) {
        if (action === 'reset') {
            const confirmation = prompt('This will permanently delete ALL data on the platform. Type "DELETE EVERYTHING" to confirm:');
            if (confirmation === 'DELETE EVERYTHING') {
                this.showNotification('Platform reset functionality is disabled in demo mode', 'warning');
            } else {
                this.showNotification('Platform reset cancelled', 'info');
            }
        }
    }

    // Session Management
    async revokeSession(sessionId) {
        if (confirm('Are you sure you want to revoke this session?')) {
            try {
                // In a real app, make API call to revoke session
                console.log('🔐 Revoking session:', sessionId);
                
                // Remove from mock data
                this.mockSessionData = this.mockSessionData.filter(session => session.id !== sessionId);
                this.updateSessionList();
                
                this.showNotification('Session revoked successfully', 'success');
            } catch (error) {
                console.error('❌ Failed to revoke session:', error);
                this.showNotification('Failed to revoke session', 'error');
            }
        }
    }

    // Integration Management
    connectIntegration(integrationName) {
        console.log('🔗 Connecting to:', integrationName);
        
        this.showNotification(`Connecting to ${integrationName}...`, 'info');
        
        // Simulate connection process
        setTimeout(() => {
            this.showNotification(`Successfully connected to ${integrationName}!`, 'success');
            
            // Update integration card
            const integrationCard = document.querySelector(`[data-integration="${integrationName}"]`);
            if (integrationCard) {
                const statusEl = integrationCard.querySelector('.integration-status');
                const actionBtn = integrationCard.querySelector('button');
                
                if (statusEl) {
                    statusEl.textContent = 'Connected';
                    statusEl.className = 'integration-status connected';
                }
                
                if (actionBtn) {
                    actionBtn.textContent = 'Configure';
                    actionBtn.className = 'btn btn-outline';
                }
            }
        }, 2000);
    }

    disconnectIntegration(integrationName) {
        if (confirm(`Are you sure you want to disconnect from ${integrationName}?`)) {
            console.log('🔌 Disconnecting from:', integrationName);
            
            this.showNotification(`Disconnected from ${integrationName}`, 'success');
            
            // Update integration card
            const integrationCard = document.querySelector(`[data-integration="${integrationName}"]`);
            if (integrationCard) {
                const statusEl = integrationCard.querySelector('.integration-status');
                const actionBtn = integrationCard.querySelector('button');
                
                if (statusEl) {
                    statusEl.textContent = 'Not Connected';
                    statusEl.className = 'integration-status disconnected';
                }
                
                if (actionBtn) {
                    actionBtn.textContent = 'Connect';
                    actionBtn.className = 'btn btn-primary';
                }
            }
        }
    }

    // Utility Functions
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
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
            background: ${this.getNotificationColor(type)};
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

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || '#3b82f6';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    loadUserAdvancedSettings() {
        if (!this.currentUser) return;
        
        try {
            // Load user preferences from localStorage
            const userLanguage = document.getElementById('userLanguage');
            const userTimezone = document.getElementById('userTimezone');
            const accessibilityMode = document.getElementById('accessibilityMode');
            
            if (userLanguage) {
                userLanguage.value = localStorage.getItem('userLanguage') || 'en';
            }
            
            if (userTimezone) {
                userTimezone.value = localStorage.getItem('userTimezone') || 'UTC';
            }
            
            if (accessibilityMode) {
                accessibilityMode.checked = localStorage.getItem('accessibilityMode') === 'true';
            }
            
            console.log('✅ User advanced settings loaded');
        } catch (error) {
            console.error('❌ Failed to load user advanced settings:', error);
        }
    }
}

// Global functions for HTML onclick handlers
function connectIntegration(name) {
    if (window.settingsManager) {
        window.settingsManager.connectIntegration(name);
    }
}

function disconnectIntegration(name) {
    if (window.settingsManager) {
        window.settingsManager.disconnectIntegration(name);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.settingsManager = new SettingsManager();
});

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

    .password-strength {
        margin-top: 8px;
    }

    .strength-bar {
        width: 100%;
        height: 4px;
        background: #f3f4f6;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 4px;
    }

    .strength-fill {
        height: 100%;
        border-radius: 2px;
        transition: all 0.3s ease;
        width: 0%;
    }

    .strength-text {
        font-size: 0.75rem;
        font-weight: 500;
    }
`;
document.head.appendChild(style); 