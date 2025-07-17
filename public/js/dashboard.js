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
        
        try {
            // Load dashboard data directly - server middleware handles auth
            await this.loadDashboardData();
            console.log('✅ Dashboard data loaded');
            
            try {
                this.initializeCharts();
                console.log('✅ Charts initialized');
            } catch (chartError) {
                console.error('❌ Chart initialization failed:', chartError);
                console.log('⚠️ Continuing without charts');
            }
            
            this.startDataRefresh();
            this.updateUserInfo();
            console.log('✅ Dashboard initialization complete');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            // If there's an error, it might be an auth issue, redirect to login
            if (error.message.includes('401') || error.message.includes('403')) {
                console.log('⚠️ Auth error detected, redirecting to login...');
                window.location.href = '/';
            } else {
                this.showToast('Failed to load dashboard data', 'error');
            }
        }
    }



    async loadDashboardData() {
        try {
            console.log('📊 Loading dashboard data...');
            const token = localStorage.getItem('token');
            
            // Get current user from localStorage
            const userData = localStorage.getItem('user');
            if (userData) {
                this.currentUser = JSON.parse(userData);
                console.log('✅ Current user loaded from localStorage:', this.currentUser.email);
            } else {
                console.log('⚠️ No user data in localStorage, attempting to fetch from server...');
                // Try to get user data from server
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const userData = await response.json();
                    this.currentUser = userData.user;
                    localStorage.setItem('user', JSON.stringify(userData.user));
                    console.log('✅ User data fetched from server:', this.currentUser.email);
                } else {
                    throw new Error('Failed to get user data');
                }
            }
            
            // Check if user has an organization
            if (!this.currentUser.organization_id) {
                this.showOrganizationSetup();
                return;
            }
            
            // Load stats data
            console.log('📈 Loading stats...');
            const statsResponse = await fetch('/api/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const statsData = await statsResponse.json();
            console.log('📈 Stats data:', statsData);
            this.updateStats(statsData);

            // Load chart data
            console.log('📊 Loading charts...');
            const chartDataResponse = await fetch('/api/dashboard/charts', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const chartData = await chartDataResponse.json();
            console.log('📊 Chart data:', chartData);
            this.updateCharts(chartData);

            // Load recent activity
            console.log('📝 Loading activity...');
            const activityResponse = await fetch('/api/dashboard/activity', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const activityData = await activityResponse.json();
            console.log('📝 Activity data:', activityData);
            this.updateActivity(activityData);

            console.log('✅ Dashboard data loaded successfully');

        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    showOrganizationSetup() {
        document.getElementById('mainDashboard').classList.add('hidden');
        document.getElementById('orgSetupSection').classList.remove('hidden');
        document.getElementById('inviteSection').classList.add('hidden');
    }

    showInviteSection() {
        document.getElementById('mainDashboard').classList.add('hidden');
        document.getElementById('orgSetupSection').classList.add('hidden');
        document.getElementById('inviteSection').classList.remove('hidden');
    }

    showMainDashboard() {
        document.getElementById('mainDashboard').classList.remove('hidden');
        document.getElementById('orgSetupSection').classList.add('hidden');
        document.getElementById('inviteSection').classList.add('hidden');
        document.getElementById('organizationSection').classList.add('hidden');
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
        const { totalEmployees, activeEmployees, departments, attendanceRate } = data;

        // Update stat numbers with animation
        this.animateNumber('totalEmployees', totalEmployees);
        this.animateNumber('activeEmployees', activeEmployees);
        this.animateNumber('departments', departments);
        this.animateNumber('attendanceRate', attendanceRate);

        // Update attendance value in the attendance card
        const attendanceValueEl = document.querySelector('.attendance-value');
        if (attendanceValueEl) {
            attendanceValueEl.textContent = `${attendanceRate}%`;
        }

        // Update donut chart meta information
        const totalRolesEl = document.getElementById('totalRoles');
        const totalEmployeesDonutEl = document.getElementById('totalEmployeesDonut');
        
        if (totalRolesEl) {
            totalRolesEl.textContent = totalEmployees;
        }
        if (totalEmployeesDonutEl) {
            totalEmployeesDonutEl.textContent = `${totalEmployees} Employees`;
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



    initializeCharts() {
        this.createGrowthChart();
        this.createRoleChart();
    }

    createGrowthChart() {
        const canvas = document.getElementById('mainLineChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.05)');

        this.charts.growth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Employee Growth',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Will be updated with real data
                    borderColor: '#667eea',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#2d3748',
                        bodyColor: '#4a5568',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `Month: ${items[0].label}`,
                            label: (item) => `Employees: ${item.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#718096',
                            font: { size: 12, weight: '500' }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(113, 128, 150, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#718096',
                            font: { size: 12, weight: '500' },
                            padding: 10
                        }
                    }
                },
                interaction: { intersect: false },
                elements: {
                    point: {
                        hoverBackgroundColor: '#667eea',
                        hoverBorderColor: '#ffffff'
                    }
                }
            }
        });
    }

    createRoleChart() {
        const canvas = document.getElementById('donutChart');
        if (!canvas) return;

        this.charts.role = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Members', 'Managers', 'Admins'],
                datasets: [{
                    data: [0, 0, 0], // Will be updated with real data
                    backgroundColor: [
                        '#667eea',
                        '#48bb78',
                        '#ed8936'
                    ],
                    borderWidth: 0,
                    hoverBorderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 12, weight: '500' },
                            color: '#4a5568'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#2d3748',
                        bodyColor: '#4a5568',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}`
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    updateCharts(data) {
        if (this.charts.growth && data.growth) {
            this.charts.growth.data.datasets[0].data = data.growth;
            this.charts.growth.update('active');
        }

        if (this.charts.role && data.roles) {
            this.charts.role.data.datasets[0].data = data.roles;
            this.charts.role.update('active');
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const userAvatarEl = document.querySelector('.user-avatar');

        if (userNameEl) {
            userNameEl.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }
        if (userRoleEl) {
            userRoleEl.textContent = this.formatRole(this.currentUser.role);
        }
        if (userAvatarEl) {
            // Use a placeholder avatar based on user name
            const initials = `${this.currentUser.first_name.charAt(0)}${this.currentUser.last_name.charAt(0)}`.toUpperCase();
            userAvatarEl.src = `https://ui-avatars.com/api/?name=${initials}&background=4e8cff&color=fff&size=48`;
        }
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
                    const userResponse = await fetch('/api/auth/verify', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        this.currentUser = userData.user;
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
                this.currentUser = userData.user;
                localStorage.setItem('user', JSON.stringify(userData.user));
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
                window.location.href = '/';
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

    // Utility method to refresh charts on window resize
    handleResize() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
}

// Initialize sidebar immediately when script loads
(function() {
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
(function() {
    function setupStandaloneSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        
        if (sidebar && sidebarToggle) {
            console.log('🔄 Setting up standalone sidebar toggle...');
            
            // Remove any existing event listeners by cloning the element
            const newToggle = sidebarToggle.cloneNode(true);
            sidebarToggle.parentNode.replaceChild(newToggle, sidebarToggle);
            
            newToggle.addEventListener('click', function(e) {
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