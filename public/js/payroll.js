// Payroll Dashboard JavaScript

class PayrollManager {
    constructor() {
        this.userProfile = null;
        this.payrolls = [];
        this.employees = [];
        this.isAdmin = false;
        this.organizationId = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing PayrollManager...');
        
        try {
            await this.checkOrganizationAndInitialize();
            
            // Test employee loading
            console.log('🧪 Testing employee loading...');
            await this.loadEmployees();
            
        } catch (error) {
            console.error('❌ Error initializing PayrollManager:', error);
        }
    }

    async checkOrganizationAndInitialize() {
        console.log('🔍 Payroll - Checking organization requirement...');
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found, redirecting to login');
            window.location.href = '/login.html';
            return;
        }

        // Show organization requirement immediately
        this.showOrganizationRequired();

        try {
            // Fast fetch with timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            
            const profilePromise = fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) throw new Error('Profile fetch failed');
                return response.json();
            });

            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            console.log('🔍 Payroll - Profile loaded:', profile);
            
            // Extract actual profile data if nested
            this.userProfile = profile.profile || profile;
            
            // Check organization requirement based on role
            if (this.userProfile.role === 'super_admin') {
                // Super admin sees website-wide payroll statistics
                console.log('✅ Super admin detected - showing website payroll statistics');
                this.showWebsitePayrollStats();
            } else if (!this.userProfile.organization_id) {
                // Admin and employees need organization
                console.log('❌ Organization required for role:', this.userProfile.role);
                // Organization requirement already shown, keep it visible
            } else {
                // Admin/employee with organization
                console.log('✅ Organization check passed - showing payroll');
                console.log('🔍 User role:', this.userProfile.role);
                console.log('🔍 Organization ID:', this.userProfile.organization_id);
                this.organizationId = this.userProfile.organization_id;
                this.isAdmin = ['admin', 'super_admin'].includes(this.userProfile.role);
                console.log('🔍 isAdmin set to:', this.isAdmin);
                this.hideOrganizationRequired();
                this.initializePayroll();
            }
            
        } catch (error) {
            console.error('⚠️ Payroll initialization error:', error);
            // Keep organization requirement shown on error
        }
    }

    showOrganizationRequired() {
        console.log('🚫 Showing organization requirement screen');
        const orgRequiredSection = document.getElementById('orgRequiredSection');
        
        if (orgRequiredSection) {
            orgRequiredSection.style.display = 'block';
        }
        
        // Hide all payroll-related content
        const elementsToHide = [
            '#payrollTopNav',
            '#payrollContent'
        ];
        
        elementsToHide.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = 'none';
        });
    }

    hideOrganizationRequired() {
        console.log('✅ Hiding organization requirement screen');
        const orgRequiredSection = document.getElementById('orgRequiredSection');
        
        if (orgRequiredSection) {
            orgRequiredSection.style.display = 'none';
        }
        
        // Show all payroll-related content
        const elementsToShow = [
            '#payrollTopNav',
            '#payrollContent'
        ];
        
        elementsToShow.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = 'block';
        });
    }

    showWebsitePayrollStats() {
        console.log('👑 Showing super admin website payroll statistics');
        this.hideOrganizationRequired();
        
        // Update page content for super admin
        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
            pageTitle.textContent = 'Website Payroll Analytics';
        }

        // Load website-wide payroll data
        this.initializeWebsitePayrollStats();
    }

    async initializeWebsitePayrollStats() {
        console.log('💰 Loading website payroll statistics...');
        
        try {
            // Load website-wide payroll data
            await this.loadWebsitePayrollMetrics();
            await this.loadWebsitePayrollCharts();
            
        } catch (error) {
            console.error('❌ Error loading website payroll statistics:', error);
        }
    }

    async loadWebsitePayrollMetrics() {
        // Mock website payroll metrics - replace with actual API calls
        const metrics = {
            totalPayroll: 2450000,
            totalEmployees: 150,
            averageSalary: 65000,
            totalOrganizations: 12
        };

        // Update metric cards
        const metricCards = document.querySelectorAll('.kpi-card');
        if (metricCards.length >= 4) {
            metricCards[0].querySelector('.kpi-value').textContent = `$${metrics.totalPayroll.toLocaleString()}`;
            metricCards[0].querySelector('.kpi-header h3').textContent = 'Total Monthly Payroll';
            
            metricCards[1].querySelector('.kpi-value').textContent = metrics.totalEmployees;
            metricCards[1].querySelector('.kpi-header h3').textContent = 'Total Employees';
            
            metricCards[2].querySelector('.kpi-value').textContent = `$${metrics.averageSalary.toLocaleString()}`;
            metricCards[2].querySelector('.kpi-header h3').textContent = 'Average Salary';
            
            metricCards[3].querySelector('.kpi-value').textContent = metrics.totalOrganizations;
            metricCards[3].querySelector('.kpi-header h3').textContent = 'Organizations';
        }
    }

    async loadWebsitePayrollCharts() {
        // Mock chart data for website payroll analytics
        const payrollByOrgData = {
            labels: ['Tech Corp', 'Design Studio', 'Finance Group', 'Marketing Inc', 'Others'],
            datasets: [{
                label: 'Monthly Payroll by Organization',
                data: [450000, 180000, 320000, 250000, 200000],
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b'
                ]
            }]
        };

        // Update existing charts or create new ones
        const chartCanvas = document.getElementById('payrollChart');
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            
            if (window.payrollChart) {
                window.payrollChart.destroy();
            }
            
            window.payrollChart = new Chart(ctx, {
                type: 'bar',
                data: payrollByOrgData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    async initializePayroll() {
        console.log('💰 Initializing payroll functionality...');
        
        try {
            // Load payroll data
            await this.loadPayrolls();
            await this.loadPayrollStats();
            
            // Setup UI based on user role
            this.setupRoleBasedUI();
            
                    // Initialize charts
        await this.initializeCharts();
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing payroll:', error);
        }
    }

    async loadPayrolls() {
        console.log('📋 Loading payrolls...');
        
        try {
            const token = localStorage.getItem('token');
            console.log('🔑 Token exists for payroll loading:', !!token);
            
            if (!token) {
                console.error('❌ No token found for payroll loading');
                return;
            }
            
            const response = await fetch('/api/payroll', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Payroll list response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Error response from payroll API:', errorData);
                throw new Error('Failed to fetch payrolls');
            }

            const data = await response.json();
            console.log('📋 Raw payroll data from API:', data);
            
            this.payrolls = data.payrolls || [];
            this.isAdmin = data.isAdmin || false;
            this.userRole = data.userRole || 'organization_member';
            
            console.log('✅ Payrolls loaded:', this.payrolls.length);
            console.log('🔍 User role:', this.userRole);
            console.log('🔍 Is admin:', this.isAdmin);
            console.log('📋 Payrolls data:', this.payrolls);
            
            this.displayPayrolls();
            this.setupRoleBasedUI();
            
            // Update charts and empty state after loading payrolls
            await this.initializeCharts();
            
        } catch (error) {
            console.error('❌ Error loading payrolls:', error);
        }
    }

    async loadPayrollStats() {
        console.log('📊 Loading payroll statistics...');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/payroll/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payroll stats');
            }

            const data = await response.json();
            const stats = data.stats;
            
            // Update user role and admin status from stats response
            this.isAdmin = stats.isAdmin || false;
            this.userRole = stats.userRole || 'organization_member';
            
            console.log('📊 Stats loaded - User role:', this.userRole, 'Is admin:', this.isAdmin);
            
            // Update KPI cards with dynamic data
            this.updateKPICards(stats);
            
        } catch (error) {
            console.error('❌ Error loading payroll stats:', error);
            // Set default empty stats on error
            this.updateKPICards({
                totalPayroll: 0,
                totalExpense: 0,
                pendingPayments: 0,
                totalPayrolls: 0,
                isAdmin: this.isAdmin,
                userRole: this.userRole
            });
        }
    }

    updateKPICards(stats) {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        if (kpiCards.length >= 4) {
            // Payroll Cost
            kpiCards[0].querySelector('.kpi-value').textContent = `$${stats.totalPayroll?.toLocaleString() || '0'}`;
            
            // Total Expense
            kpiCards[1].querySelector('.kpi-value').textContent = `$${stats.totalExpense?.toLocaleString() || '0'}`;
            
            // Pending payments
            kpiCards[2].querySelector('.kpi-value').textContent = `$${stats.pendingPayments?.toLocaleString() || '0'}`;
            
            // Total Payrolls
            kpiCards[3].querySelector('.kpi-value').textContent = stats.totalPayrolls || '0';
            
            // Update trend indicators based on data
            this.updateTrendIndicators(stats);
        }
    }
    
    updateTrendIndicators(stats) {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        if (kpiCards.length >= 4) {
            // Update trend indicators to show "No data" when there's no payroll data
            const hasData = stats.totalPayrolls > 0;
            
            kpiCards.forEach((card, index) => {
                const trendElement = card.querySelector('.kpi-trend');
                const trendLabel = card.querySelector('.trend-label');
                
                if (trendElement && trendLabel) {
                    if (hasData) {
                        // Show actual trends when there's data
                        trendElement.className = 'kpi-trend positive';
                        trendElement.innerHTML = '<i class="fas fa-arrow-up"></i><span>0%</span>';
                        trendLabel.textContent = 'this month';
                    } else {
                        // Show "No data" when there's no payroll data
                        trendElement.className = 'kpi-trend neutral';
                        trendElement.innerHTML = '<i class="fas fa-minus"></i><span>No data</span>';
                        trendLabel.textContent = 'no payrolls yet';
                    }
                }
            });
        }
    }

    displayPayrolls() {
        console.log('📋 Displaying payrolls:', this.payrolls);
        
        const tbody = document.querySelector('.payroll-table tbody');
        if (!tbody) {
            console.error('❌ Payroll table tbody not found');
            return;
        }

        if (this.payrolls.length === 0) {
            const noDataMessage = this.isAdmin 
                ? 'No payrolls found. Create your first payroll to get started.'
                : 'No payroll records found for you yet. Contact your admin to create payrolls.';
            
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">
                        <div class="no-data-content">
                            <i class="fas fa-file-invoice-dollar"></i>
                            <p>No payrolls found</p>
                            <small>${noDataMessage}</small>
                        </div>
                    </td>
                </tr>
            `;
            
            // Also show empty state for charts
            this.showEmptyStateForCharts();
            return;
        }

        tbody.innerHTML = this.payrolls.map(payroll => {
            const employee = payroll.employee;
            const initials = this.getInitials(`${employee.first_name} ${employee.last_name}`);
            const formattedDate = this.formatDate(payroll.created_at);
            const statusClass = payroll.status === 'completed' ? 'completed' : 'pending';
            const statusText = payroll.status === 'completed' ? 'Completed' : 'Pending';
            
            // Add payment button for pending payrolls (admin only)
            let actionButtons = '';
            if (this.isAdmin) {
                if (payroll.status === 'pending') {
                    actionButtons = `
                        <div class="action-buttons">
                            <button class="btn-payment" onclick="payrollManager.proceedToPayment('${payroll.id}')" title="Proceed to Payment">
                                <i class="fas fa-credit-card"></i>
                            </button>
                            <i class="fas fa-eye action-icon" onclick="payrollManager.viewPayroll('${payroll.id}')" title="View Details"></i>
                            <i class="fas fa-ellipsis-v action-icon" onclick="payrollManager.showActionMenu(this, '${payroll.id}')" title="More Options"></i>
                        </div>
                    `;
                } else {
                    actionButtons = `
                        <div class="action-buttons">
                            <i class="fas fa-eye action-icon" onclick="payrollManager.viewPayroll('${payroll.id}')" title="View Details"></i>
                            <i class="fas fa-ellipsis-v action-icon" onclick="payrollManager.showActionMenu(this, '${payroll.id}')" title="More Options"></i>
                        </div>
                    `;
                }
            } else {
                // Employees can only view their own payroll details
                actionButtons = `
                    <div class="action-buttons">
                        <i class="fas fa-eye action-icon" onclick="payrollManager.viewPayroll('${payroll.id}')" title="View Details"></i>
                    </div>
                `;
            }

            if (this.isAdmin) {
                // Admin view - shows employee information
                return `
                    <tr>
                        <td><input type="checkbox"></td>
                        <td>${payroll.payroll_id}</td>
                        <td>
                            <div class="employee-info">
                                <div class="employee-avatar">${initials}</div>
                                <span>${employee.first_name} ${employee.last_name}</span>
                            </div>
                        </td>
                        <td>${employee.role}</td>
                        <td>${formattedDate}</td>
                        <td>$${parseFloat(payroll.base_salary).toFixed(2)}</td>
                        <td>$${parseFloat(payroll.reimbursement || 0).toFixed(2)}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${actionButtons}</td>
                    </tr>
                `;
            } else {
                // Employee view - shows pay period instead of employee info
                const payPeriod = `${payroll.start_date} - ${payroll.end_date}`;
                return `
                    <tr>
                        <td><input type="checkbox"></td>
                        <td>${payroll.payroll_id}</td>
                        <td>${payPeriod}</td>
                        <td>${formattedDate}</td>
                        <td>$${parseFloat(payroll.base_salary).toFixed(2)}</td>
                        <td>$${parseFloat(payroll.reimbursement || 0).toFixed(2)}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>${actionButtons}</td>
                    </tr>
                `;
            }
        }).join('');
    }

    getInitials(name) {
        return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }) + ' - ' + date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    setupRoleBasedUI() {
        console.log('👤 Setting up role-based UI...');
        console.log('🔍 isAdmin status:', this.isAdmin);
        console.log('🔍 User role:', this.userRole);
        console.log('🔍 User profile:', this.userProfile);
        
        // Handle new payroll button visibility
        const newPayrollBtn = document.querySelector('.new-payroll-btn');
        if (newPayrollBtn) {
            if (this.isAdmin) {
                console.log('✅ Admin user - showing new payroll button');
                newPayrollBtn.style.display = 'flex';
                
                // Add event listener for new payroll creation
                newPayrollBtn.removeEventListener('click', this.showNewPayrollModal.bind(this));
                newPayrollBtn.addEventListener('click', () => {
                    console.log('🖱️ New Payroll button clicked!');
                    this.showNewPayrollModal();
                });
            } else {
                console.log('❌ Non-admin user - hiding new payroll button');
                newPayrollBtn.style.display = 'none';
            }
        }

        // Update page title based on role
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            if (this.isAdmin) {
                pageTitle.textContent = 'Payroll Management';
            } else {
                pageTitle.textContent = 'My Payroll';
            }
        }

        // Update KPI card titles for employees
        if (!this.isAdmin) {
            this.updateEmployeeKPICards();
        }

        // Update table headers based on role
        this.updateTableHeaders();

        // Update action buttons visibility
        this.updateActionButtons();

        // Add employee-view class to body for CSS targeting
        if (!this.isAdmin) {
            document.body.classList.add('employee-view');
        } else {
            document.body.classList.remove('employee-view');
        }
    }

    updateEmployeeKPICards() {
        console.log('👤 Updating KPI cards for employee view...');
        
        const kpiCards = document.querySelectorAll('.kpi-card');
        if (kpiCards.length >= 4) {
            // Update titles for employee view
            const titles = kpiCards[0].querySelectorAll('.kpi-title');
            if (titles.length > 0) {
                titles[0].textContent = 'My Total Earnings';
                titles[1].textContent = 'My Total Deductions';
                titles[2].textContent = 'Pending Payments';
                titles[3].textContent = 'Total Payrolls';
            }
        }
    }

    updateTableHeaders() {
        console.log('📋 Updating table headers based on role...');
        
        const tableHeaders = document.querySelectorAll('.payroll-table th');
        if (tableHeaders.length > 0) {
            if (this.isAdmin) {
                // Admin sees employee column
                if (tableHeaders[1]) {
                    tableHeaders[1].textContent = 'Employee';
                }
            } else {
                // Employee doesn't need employee column
                if (tableHeaders[1]) {
                    tableHeaders[1].textContent = 'Pay Period';
                }
            }
        }
    }

    updateActionButtons() {
        console.log('🔧 Updating action buttons based on role...');
        
        // Hide action menus for non-admin users
        const actionMenus = document.querySelectorAll('.action-menu');
        actionMenus.forEach(menu => {
            if (!this.isAdmin) {
                menu.style.display = 'none';
            }
        });

        // Update action icons visibility
        const actionIcons = document.querySelectorAll('.action-icon');
        actionIcons.forEach(icon => {
            if (!this.isAdmin) {
                icon.style.display = 'none';
            }
        });
    }

    showNewPayrollModal() {
        console.log('➕ Showing new payroll modal...');
        console.log('🔍 Modal element:', document.getElementById('new-payroll-modal'));
        
        // Load employees for the dropdown
        this.loadEmployees();
        
        // Show the modal
        const modal = document.getElementById('new-payroll-modal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal displayed');
            
            // Add visual debugging
            
            // Set default values
            this.setDefaultValues();
            
            // Initialize calculation system
            this.initializeCalculationSystem();
            
            // Remove debugging styles after 2 seconds
            setTimeout(() => {
                modal.style.border = '';
                modal.style.backgroundColor = '';
            }, 2000);
        } else {
            console.log('❌ Modal not found');
        }
    }

    initializeCalculationSystem() {
        console.log('🚀 Initializing calculation system...');
        
        // Set up calculation listeners
        this.setupCalculationListeners();
        
        // Set up additional payment listeners
        this.setupAdditionalPaymentListeners();
        
        // Perform initial calculation
        this.updateCalculations();
        
        console.log('✅ Calculation system initialized');
    }

    setDefaultValues() {
        console.log('🔧 Setting default values...');
        
        // Set default pay period to weekly
        const payPeriodSelect = document.getElementById('payroll-period');
        if (payPeriodSelect) {
            payPeriodSelect.value = 'weekly';
            console.log('✅ Default pay period set to weekly');
        }
        
        // Set default dates
        const today = new Date();
        const startDateInput = document.getElementById('payroll-start-date');
        const endDateInput = document.getElementById('payroll-end-date');
        
        if (startDateInput) {
            startDateInput.value = today.toISOString().split('T')[0];
        }
        
        if (endDateInput) {
            // Set end date to 7 days from today for weekly pay period
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 7);
            endDateInput.value = endDate.toISOString().split('T')[0];
        }
        
        console.log('✅ Default values set');
    }

    async loadEmployees() {
        console.log('👥 Loading employees for payroll...');
        
        if (!this.isAdmin) {
            console.log('❌ User is not admin, skipping employee load');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            console.log('🔑 Token exists:', !!token);
            
            const response = await fetch('/api/payroll/employees', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`Failed to fetch employees: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('📥 Employee data received:', data);
            
            this.employees = data.employees || [];
            console.log('👥 Employees loaded:', this.employees.length);
            
            this.populateEmployeeDropdown();
            
        } catch (error) {
            console.error('❌ Error loading employees:', error);
            this.showToast('Failed to load employees: ' + error.message, 'error');
        }
    }

    populateEmployeeDropdown() {
        console.log('📋 Populating employee dropdown...');
        
        const select = document.getElementById('payroll-employee');
        if (!select) {
            console.error('❌ Employee select element not found');
            return;
        }

        console.log('👥 Available employees:', this.employees);

        // Clear existing options except the first one
        select.innerHTML = '<option value="">Choose an employee...</option>';
        
        // Get current user info
        const currentUser = this.getCurrentUser();
        console.log('👤 Current user:', currentUser);
        
        this.employees.forEach(employee => {
            console.log('➕ Adding employee:', employee);
            
            // Skip if this is the current user
            if (currentUser && employee.id === currentUser.id) {
                console.log('🚫 Skipping current user:', employee.first_name, employee.last_name);
                return;
            }
            
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = `${employee.first_name} ${employee.last_name} (${employee.role})`;
            select.appendChild(option);
        });
        
        console.log('✅ Employee dropdown populated with', this.employees.length, 'employees (excluding current user)');
        
        // Show message if no employees available
        if (this.employees.length === 0) {
            const noEmployeesOption = document.createElement('option');
            noEmployeesOption.value = "";
            noEmployeesOption.textContent = "No employees available for payroll";
            noEmployeesOption.disabled = true;
            select.appendChild(noEmployeesOption);
        }
    }

    async createPayroll(formData) {
        try {
            console.log('💰 Creating new payroll...');
            console.log('📝 Form data:', formData);
            
            const token = localStorage.getItem('token');
            console.log('🔑 Token exists:', !!token);
            
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const response = await fetch('/api/payroll', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Server error response:', errorData);
                throw new Error(errorData.error || 'Failed to create payroll');
            }

            const data = await response.json();
            console.log('✅ Payroll created successfully:', data);
            
            // Close modal and refresh data
            this.closeNewPayrollModal();
            await this.loadPayrolls();
            await this.loadPayrollStats();
            
            this.showToast('Payroll created successfully!', 'success');
            
        } catch (error) {
            console.error('❌ Error creating payroll:', error);
            this.showToast(error.message, 'error');
        }
    }

    closeNewPayrollModal() {
        document.getElementById('new-payroll-modal').style.display = 'none';
        document.getElementById('new-payroll-form').reset();
    }

    async viewPayroll(payrollId) {
        try {
            console.log('👁️ Viewing payroll:', payrollId);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/${payrollId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payroll details');
            }

            const data = await response.json();
            const payroll = data.payroll;
            
            this.displayPayrollDetails(payroll);
            document.getElementById('view-payroll-modal').style.display = 'flex';
            
        } catch (error) {
            console.error('❌ Error viewing payroll:', error);
            this.showToast('Failed to load payroll details', 'error');
        }
    }

    displayPayrollDetails(payroll) {
        const detailsContainer = document.getElementById('payroll-details');
        if (!detailsContainer) return;

        const employee = payroll.employee || {};
        const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
        
        detailsContainer.innerHTML = `
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Payroll ID:</span>
                <span class="payroll-detail-value">${payroll.payroll_id}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Employee:</span>
                <span class="payroll-detail-value">${employeeName}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Pay Period:</span>
                <span class="payroll-detail-value">${payroll.pay_period}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Start Date:</span>
                <span class="payroll-detail-value">${this.formatDate(payroll.start_date)}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">End Date:</span>
                <span class="payroll-detail-value">${this.formatDate(payroll.end_date)}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Base Salary:</span>
                <span class="payroll-detail-value amount">$${payroll.base_salary?.toLocaleString() || '0'}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Bonus:</span>
                <span class="payroll-detail-value amount">$${payroll.bonus?.toLocaleString() || '0'}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Reimbursement:</span>
                <span class="payroll-detail-value amount">$${payroll.reimbursement?.toLocaleString() || '0'}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Deductions:</span>
                <span class="payroll-detail-value amount">$${payroll.deductions?.toLocaleString() || '0'}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Total Amount:</span>
                <span class="payroll-detail-value amount">$${payroll.total_amount?.toLocaleString() || '0'}</span>
            </div>
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Status:</span>
                <span class="payroll-detail-value status ${payroll.status}">${payroll.status}</span>
            </div>
            ${payroll.notes ? `
            <div class="payroll-detail-item">
                <span class="payroll-detail-label">Notes:</span>
                <span class="payroll-detail-value">${payroll.notes}</span>
            </div>
            ` : ''}
        `;
    }

    showActionMenu(icon, payrollId) {
        // Only show action menu for admin users
        if (!this.isAdmin) {
            console.log('❌ Non-admin user cannot access action menu');
            return;
        }
        
        console.log('⚙️ Showing action menu for payroll:', payrollId);
        
        // Create action menu dropdown
        const menu = document.createElement('div');
        menu.className = 'action-dropdown';
        menu.innerHTML = `
            <div class="action-dropdown-content">
                <div class="action-item" onclick="payrollManager.viewPayroll('${payrollId}')">
                    <i class="fas fa-eye"></i>
                    <span>View Details</span>
                </div>
                <div class="action-item" onclick="payrollManager.editPayroll('${payrollId}')">
                    <i class="fas fa-edit"></i>
                    <span>Edit Payroll</span>
                </div>
                <div class="action-item delete" onclick="payrollManager.deletePayroll('${payrollId}')">
                    <i class="fas fa-trash"></i>
                    <span>Delete</span>
                </div>
            </div>
        `;
        
        // Position the menu near the icon
        const rect = icon.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 100}px`;
        menu.style.zIndex = '1000';
        
        // Add to body and handle click outside
        document.body.appendChild(menu);
        
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 500;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    setupEventListeners() {
        // New payroll form submission
        const newPayrollForm = document.getElementById('new-payroll-form');
        if (newPayrollForm) {
            console.log('✅ Found new payroll form, setting up event listener');
            newPayrollForm.addEventListener('submit', (e) => {
                console.log('🖱️ Form submit event triggered');
                e.preventDefault();
                console.log('🛑 Prevented default form submission');
                
                const formData = new FormData(newPayrollForm);
                console.log('📋 FormData entries:');
                for (let [key, value] of formData.entries()) {
                    console.log(`  ${key}: ${value}`);
                }
                
                const data = Object.fromEntries(formData.entries());
                console.log('📝 Converted form data:', data);
                
                this.createPayroll(data);
            });
        } else {
            console.error('❌ New payroll form not found');
        }

        // Hourly rate calculation listeners
        this.setupCalculationListeners();

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.modal-close, .btn-secondary');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modals when clicking outside
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Organization action buttons
        const createOrgBtn = document.getElementById('create-org-btn');
        if (createOrgBtn) {
            createOrgBtn.addEventListener('click', () => {
                window.location.href = '/organizations';
            });
        }

        const joinOrgBtn = document.getElementById('join-org-btn');
        if (joinOrgBtn) {
            joinOrgBtn.addEventListener('click', () => {
                window.location.href = '/organizations';
            });
        }
    }

    setupCalculationListeners() {
        const hourlyRateInput = document.getElementById('hourly-rate');
        if (hourlyRateInput) {
            hourlyRateInput.addEventListener('input', () => this.updateCalculations());
        }
        
        // Add listener for pay period selection
        const payPeriodSelect = document.getElementById('payroll-period');
        if (payPeriodSelect) {
            payPeriodSelect.addEventListener('change', () => this.updateCalculations());
        }
    }

    updateWeeksPerPeriod() {
        const payPeriodSelect = document.getElementById('pay-period');
        const weeksPerPeriodInput = document.getElementById('weeks-per-period');
        
        if (payPeriodSelect && weeksPerPeriodInput) {
            const payPeriod = payPeriodSelect.value;
            let defaultWeeks = 2; // Default to bi-weekly
            
            switch (payPeriod) {
                case 'weekly':
                    defaultWeeks = 1;
                    break;
                case 'bi-weekly':
                    defaultWeeks = 2;
                    break;
                case 'monthly':
                    defaultWeeks = 4;
                    break;
                case 'quarterly':
                    defaultWeeks = 13;
                    break;
                case 'yearly':
                    defaultWeeks = 52;
                    break;
            }
            
            weeksPerPeriodInput.value = defaultWeeks;
            this.updateCalculations();
        }
    }

    updateCalculations() {
        const hourlyRate = parseFloat(document.getElementById('hourly-rate')?.value) || 0;
        const hoursPerDay = 8;
        const daysPerWeek = 7;  // Changed from 5 to 7
        const weeksMonthly = 4;  // Changed from 4.33 to 4
        const monthsYearly = 12;

        const dailyPay = hourlyRate * hoursPerDay;
        const weeklyPay = dailyPay * daysPerWeek;
        const monthlyPay = weeklyPay * weeksMonthly;
        const yearlyPay = monthlyPay * monthsYearly;

        this.updateCalculationDisplay('daily-pay', dailyPay, `${hourlyRate} × ${hoursPerDay} hours = Daily Pay`);
        this.updateCalculationDisplay('weekly-pay', weeklyPay, `${dailyPay.toFixed(2)} × ${daysPerWeek} days = Weekly Pay`);
        this.updateCalculationDisplay('monthly-pay', monthlyPay, `${weeklyPay.toFixed(2)} × ${weeksMonthly} weeks = Monthly Pay`);
        this.updateCalculationDisplay('yearly-pay', yearlyPay, `${monthlyPay.toFixed(2)} × ${monthsYearly} months = Yearly Pay`);

        // Get selected pay period
        const payPeriodSelect = document.getElementById('payroll-period');
        const selectedPeriod = payPeriodSelect?.value;
        
        let baseSalary = 0;
        
        // Set base salary based on selected pay period
        if (selectedPeriod === 'weekly') {
            baseSalary = weeklyPay;
        } else if (selectedPeriod === 'monthly') {
            baseSalary = monthlyPay;
        } else {
            // Default to weekly if no period selected
            baseSalary = weeklyPay;
        }

        const baseSalaryInput = document.getElementById('payroll-base-salary');
        if (baseSalaryInput) {
            baseSalaryInput.value = baseSalary.toFixed(2);
        }

        this.updateFinalSummary(baseSalary);
    }

    updateCalculationDisplay(elementId, value, formula) {
        const element = document.getElementById(elementId);
        if (element) {
            const formulaElement = element.querySelector('.calculation-formula');
            const resultElement = element.querySelector('.calculation-result');
            
            if (formulaElement) {
                formulaElement.textContent = formula;
            }
            if (resultElement) {
                resultElement.textContent = `$${value.toFixed(2)}`;
            }
        } else {
            console.log(`❌ Element not found: ${elementId}`);
        }
    }

    updateFinalSummary(baseSalary) {
        console.log('💰 Updating final summary with base salary:', baseSalary);
        
        // Get additional payment values
        const bonus = parseFloat(document.getElementById('payroll-bonus')?.value) || 0;
        const reimbursement = parseFloat(document.getElementById('payroll-reimbursement')?.value) || 0;
        const deductions = parseFloat(document.getElementById('payroll-deductions')?.value) || 0;
        
        console.log('📊 Additional payments:', { bonus, reimbursement, deductions });
        
        // Calculate total
        const total = baseSalary + bonus + reimbursement - deductions;
        
        console.log('💵 Total calculation:', `${baseSalary} + ${bonus} + ${reimbursement} - ${deductions} = ${total}`);
        
        // Update final summary display
        const finalBaseSalaryElement = document.getElementById('final-base-salary');
        const finalBonusElement = document.getElementById('final-bonus');
        const finalReimbursementElement = document.getElementById('final-reimbursement');
        const finalDeductionsElement = document.getElementById('final-deductions');
        const finalTotalElement = document.getElementById('final-total');
        
        if (finalBaseSalaryElement) {
            finalBaseSalaryElement.textContent = `$${baseSalary.toFixed(2)}`;
        }
        
        if (finalBonusElement) {
            finalBonusElement.textContent = `$${bonus.toFixed(2)}`;
        }
        
        if (finalReimbursementElement) {
            finalReimbursementElement.textContent = `$${reimbursement.toFixed(2)}`;
        }
        
        if (finalDeductionsElement) {
            finalDeductionsElement.textContent = `-$${deductions.toFixed(2)}`;
        }
        
        if (finalTotalElement) {
            finalTotalElement.textContent = `$${total.toFixed(2)}`;
        }
        
        console.log('✅ Final summary updated');
    }

    setupAdditionalPaymentListeners() {
        console.log('💳 Setting up additional payment listeners...');
        
        // Get additional payment inputs
        const bonusInput = document.getElementById('payroll-bonus');
        const reimbursementInput = document.getElementById('payroll-reimbursement');
        const deductionsInput = document.getElementById('payroll-deductions');
        
        // Add event listeners for real-time summary updates
        if (bonusInput) {
            bonusInput.addEventListener('input', () => this.updateFinalSummaryFromInputs());
        }
        if (reimbursementInput) {
            reimbursementInput.addEventListener('input', () => this.updateFinalSummaryFromInputs());
        }
        if (deductionsInput) {
            deductionsInput.addEventListener('input', () => this.updateFinalSummaryFromInputs());
        }
        
        console.log('✅ Additional payment listeners set up');
    }

    updateFinalSummaryFromInputs() {
        console.log('🔄 Updating final summary from inputs...');
        
        // Get current base salary from hidden field
        const baseSalary = parseFloat(document.getElementById('payroll-base-salary')?.value) || 0;
        
        // Update final summary with current values
        this.updateFinalSummary(baseSalary);
    }

    async initializeCharts() {
        // Initialize charts if they exist
        const chartCanvas = document.getElementById('payrollChart');
        if (chartCanvas) {
            await this.initializePayrollChart();
        }

        const bonusesCanvas = document.getElementById('bonusesChart');
        if (bonusesCanvas) {
            await this.initializeBonusesChart();
        }

        // Update bonuses breakdown
        this.updateBonusesBreakdown();
        
        // Update KPI cards
        this.updateKPICards();
        
        // Show/hide empty state based on data
        if (this.payrolls && this.payrolls.length > 0) {
            this.hideEmptyStateForCharts();
        } else {
            this.showEmptyStateForCharts();
        }
    }

    async initializePayrollChart() {
        console.log('📊 Initializing payroll chart...');
        
        const canvas = document.getElementById('payrollChart');
        if (!canvas) {
            console.log('❌ Payroll chart canvas not found');
            return;
        }

        // Check if chart already exists and destroy it
        if (window.payrollChart && typeof window.payrollChart.destroy === 'function') {
            window.payrollChart.destroy();
        }

        // Get dynamic data based on user role
        let chartData;
        
        if (this.isAdmin) {
            // Admin sees organization-wide data
            chartData = await this.getAdminPayrollData();
        } else {
            // Employee sees only their own data
            chartData = await this.getEmployeePayrollData();
        }

        const ctx = canvas.getContext('2d');
        window.payrollChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        console.log('✅ Payroll chart initialized');
    }

    async getAdminPayrollData() {
        // Admin sees organization-wide payroll data
        // Check if there's actual payroll data
        const hasPayrollData = this.payrolls && this.payrolls.length > 0;
        
        if (hasPayrollData) {
            // Generate real data from payrolls
            const monthlyData = this.generateMonthlyPayrollData();
            return {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Payroll Cost',
                    data: monthlyData.payrollCosts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: monthlyData.expenses,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4
                }]
            };
        } else {
            // Show empty state with placeholder data
            return {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Payroll Cost',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4
                }]
            };
        }
    }
    
    generateMonthlyPayrollData() {
        // Generate monthly data from actual payroll records
        const monthlyData = {
            payrollCosts: [0, 0, 0, 0, 0, 0],
            expenses: [0, 0, 0, 0, 0, 0]
        };
        
        if (this.payrolls && this.payrolls.length > 0) {
            this.payrolls.forEach(payroll => {
                const date = new Date(payroll.created_at);
                const month = date.getMonth(); // 0-11
                
                if (month < 6) { // Only show last 6 months
                    monthlyData.payrollCosts[month] += parseFloat(payroll.total_amount || 0);
                    monthlyData.expenses[month] += parseFloat(payroll.total_amount || 0) * 0.2; // 20% as expenses
                }
            });
        }
        
        return monthlyData;
    }

    async getEmployeePayrollData() {
        // Employee sees only their own payroll data
        // Since user has no payrolls, show all zeros
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'My Payroll',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }]
        };
    }

    async initializeBonusesChart() {
        console.log('🎁 Initializing bonuses chart...');
        
        const canvas = document.getElementById('bonusesChart');
        if (!canvas) {
            console.log('❌ Bonuses chart canvas not found');
            return;
        }

        // Check if chart already exists and destroy it
        if (window.bonusesChart && typeof window.bonusesChart.destroy === 'function') {
            window.bonusesChart.destroy();
        }

        // Get dynamic data based on user role
        let chartData;
        
        if (this.isAdmin) {
            // Admin sees organization-wide bonuses data
            chartData = await this.getAdminBonusesData();
        } else {
            // Employee sees only their own bonuses data
            chartData = await this.getEmployeeBonusesData();
        }

        const ctx = canvas.getContext('2d');
        window.bonusesChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                cutout: '70%'
            }
        });
        
        console.log('✅ Bonuses chart initialized');
    }

    async getAdminBonusesData() {
        // Admin sees organization-wide bonuses data
        // Check if there's actual payroll data
        const hasPayrollData = this.payrolls && this.payrolls.length > 0;
        
        if (hasPayrollData) {
            // Calculate real bonuses and incentives from payroll data
            const bonusesData = this.calculateBonusesData();
            return {
                labels: ['Bonuses', 'Incentives'],
                datasets: [{
                    data: [bonusesData.bonuses, bonusesData.incentives],
                    backgroundColor: ['#667eea', '#764ba2'],
                    borderWidth: 0
                }]
            };
        } else {
            // Show empty state
            return {
                labels: ['Bonuses', 'Incentives'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#667eea', '#764ba2'],
                    borderWidth: 0
                }]
            };
        }
    }
    
    calculateBonusesData() {
        let totalBonuses = 0;
        let totalIncentives = 0;
        
        if (this.payrolls && this.payrolls.length > 0) {
            this.payrolls.forEach(payroll => {
                totalBonuses += parseFloat(payroll.bonus || 0);
                // Calculate incentives as 10% of base salary
                totalIncentives += parseFloat(payroll.base_salary || 0) * 0.1;
            });
        }
        
        return {
            bonuses: totalBonuses,
            incentives: totalIncentives
        };
    }

    async getEmployeeBonusesData() {
        // Employee sees only their own bonuses data
        // Since user has no payrolls, show all zeros
        return {
            labels: ['My Bonuses', 'My Incentives'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#10b981', '#059669'],
                borderWidth: 0
            }]
        };
    }

    updateBonusesBreakdown() {
        console.log('📊 Updating bonuses breakdown...');
        
        const breakdownContainer = document.querySelector('.bonuses-breakdown');
        if (!breakdownContainer) {
            console.log('❌ Bonuses breakdown container not found');
            return;
        }

        // Calculate dynamic bonuses data
        const bonusesData = this.calculateBonusesData();
        const hasData = this.payrolls && this.payrolls.length > 0;

        if (this.isAdmin) {
            // Admin sees organization-wide breakdown
            breakdownContainer.innerHTML = `
                <div class="breakdown-item">
                    <div class="breakdown-bar bonuses"></div>
                    <div class="breakdown-label">Bonuses</div>
                    <div class="breakdown-value">$${hasData ? bonusesData.bonuses.toFixed(2) : '0.00'}</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-bar incentives"></div>
                    <div class="breakdown-label">Incentives</div>
                    <div class="breakdown-value">$${hasData ? bonusesData.incentives.toFixed(2) : '0.00'}</div>
                </div>
            `;
        } else {
            // Employee sees only their own breakdown
            breakdownContainer.innerHTML = `
                <div class="breakdown-item">
                    <div class="breakdown-bar bonuses"></div>
                    <div class="breakdown-label">My Bonuses</div>
                    <div class="breakdown-value">$${hasData ? bonusesData.bonuses.toFixed(2) : '0.00'}</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-bar incentives"></div>
                    <div class="breakdown-label">My Incentives</div>
                    <div class="breakdown-value">$${hasData ? bonusesData.incentives.toFixed(2) : '0.00'}</div>
                </div>
            `;
        }

        // Update the donut center total
        const donutTotal = document.querySelector('.donut-amount');
        if (donutTotal) {
            const totalAmount = bonusesData.bonuses + bonusesData.incentives;
            donutTotal.textContent = `$${hasData ? totalAmount.toFixed(2) : '0.00'}`;
        }

        console.log('✅ Bonuses breakdown updated');
    }

    updateKPICards() {
        console.log('📊 Updating KPI cards...');
        
        const kpiCards = document.querySelectorAll('.kpi-card');
        if (kpiCards.length === 0) {
            console.log('❌ KPI cards not found');
            return;
        }

        // Calculate dynamic data
        const hasData = this.payrolls && this.payrolls.length > 0;
        const totalPayroll = hasData ? this.payrolls.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0) : 0;
        const totalBonuses = hasData ? this.payrolls.reduce((sum, p) => sum + parseFloat(p.bonus || 0), 0) : 0;
        const pendingPayrolls = hasData ? this.payrolls.filter(p => p.status === 'pending').length : 0;
        const completedPayrolls = hasData ? this.payrolls.filter(p => p.status === 'completed').length : 0;

        if (this.isAdmin) {
            // Admin sees organization-wide KPIs
            // First card - Payroll Cost
            if (kpiCards[0]) {
                kpiCards[0].querySelector('.kpi-header h3').textContent = 'Payroll Cost';
                kpiCards[0].querySelector('.kpi-value').textContent = `$${totalPayroll.toFixed(2)}`;
            }
            
            // Second card - Total Expense
            if (kpiCards[1]) {
                kpiCards[1].querySelector('.kpi-header h3').textContent = 'Total Expense';
                kpiCards[1].querySelector('.kpi-value').textContent = `$${(totalPayroll * 0.2).toFixed(2)}`;
            }
            
            // Third card - Pending payments
            if (kpiCards[2]) {
                kpiCards[2].querySelector('.kpi-header h3').textContent = 'Pending payments';
                kpiCards[2].querySelector('.kpi-value').textContent = `$${(pendingPayrolls * 1000).toFixed(2)}`;
            }
            
            // Fourth card - Total Payrolls
            if (kpiCards[3]) {
                kpiCards[3].querySelector('.kpi-header h3').textContent = 'Total Payrolls';
                kpiCards[3].querySelector('.kpi-value').textContent = this.payrolls.length || 0;
            }
        } else {
            // Employee sees only their own KPIs
            // First card - My Payroll
            if (kpiCards[0]) {
                kpiCards[0].querySelector('.kpi-header h3').textContent = 'My Payroll';
                kpiCards[0].querySelector('.kpi-value').textContent = `$${totalPayroll.toFixed(2)}`;
            }
            
            // Second card - My Bonuses
            if (kpiCards[1]) {
                kpiCards[1].querySelector('.kpi-header h3').textContent = 'My Bonuses';
                kpiCards[1].querySelector('.kpi-value').textContent = `$${totalBonuses.toFixed(2)}`;
            }
            
            // Third card - My Incentives
            if (kpiCards[2]) {
                kpiCards[2].querySelector('.kpi-header h3').textContent = 'My Incentives';
                kpiCards[2].querySelector('.kpi-value').textContent = `$${(totalPayroll * 0.1).toFixed(2)}`;
            }
            
            // Fourth card - Total Received
            if (kpiCards[3]) {
                kpiCards[3].querySelector('.kpi-header h3').textContent = 'Total Received';
                kpiCards[3].querySelector('.kpi-value').textContent = `$${(totalPayroll + totalBonuses).toFixed(2)}`;
            }
        }

        // Update trend indicators
        this.updateTrendIndicators({
            totalPayrolls: this.payrolls.length || 0,
            totalPayroll: totalPayroll,
            pendingPayments: pendingPayrolls
        });

        console.log('✅ KPI cards updated');
    }

    getCurrentUser() {
        try {
            // Get user info from localStorage or profile data
            const profileData = localStorage.getItem('userProfile');
            if (profileData) {
                return JSON.parse(profileData);
            }
            
            // Fallback: try to get from token
            const token = localStorage.getItem('token');
            if (token) {
                // Decode JWT token to get user info
                const payload = JSON.parse(atob(token.split('.')[1]));
                return {
                    id: payload.sub,
                    email: payload.email
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error getting current user:', error);
            return null;
        }
    }
    
    showEmptyStateForCharts() {
        console.log('📊 Showing empty state for charts...');
        
        // Add empty state overlay to charts
        const chartCards = document.querySelectorAll('.chart-card');
        chartCards.forEach(card => {
            // Check if empty state overlay already exists
            if (!card.querySelector('.empty-state-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'empty-state-overlay';
                overlay.innerHTML = `
                    <div class="empty-state-content">
                        <i class="fas fa-chart-line"></i>
                        <h4>No Data Available</h4>
                        <p>Create your first payroll to see charts and analytics</p>
                    </div>
                `;
                card.appendChild(overlay);
            }
        });
    }
    
    hideEmptyStateForCharts() {
        console.log('📊 Hiding empty state for charts...');
        
        // Remove empty state overlays
        const emptyStateOverlays = document.querySelectorAll('.empty-state-overlay');
        emptyStateOverlays.forEach(overlay => {
            overlay.remove();
        });
    }

    proceedToPayment(payrollId) {
        console.log('💳 Proceeding to payment for payroll:', payrollId);
        
        const payroll = this.payrolls.find(p => p.id === payrollId);
        if (!payroll) {
            console.error('❌ Payroll not found:', payrollId);
            this.showToast('Payroll not found', 'error');
            return;
        }

        // Store current payroll for payment processing
        this.currentPaymentPayroll = payroll;
        
        // Show payment modal
        this.showPaymentModal();
    }

    showPaymentModal() {
        console.log('💳 Showing payment modal');
        
        // Create payment modal if it doesn't exist
        if (!document.getElementById('payment-modal')) {
            this.createPaymentModal();
        }
        
        const modal = document.getElementById('payment-modal');
        modal.style.display = 'block';
        
        // Populate payment details
        this.populatePaymentDetails();
    }

    createPaymentModal() {
        const modalHTML = `
            <div id="payment-modal" class="modal payment-modal">
                <div class="modal-content payment-modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-credit-card"></i> Payment Processing</h3>
                        <button class="modal-close" onclick="payrollManager.closePaymentModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Payment Summary -->
                        <div class="payment-summary">
                            <h4>Payment Summary</h4>
                            <div class="payment-details">
                                <div class="payment-row">
                                    <span>Employee:</span>
                                    <span id="payment-employee-name">Loading...</span>
                                </div>
                                <div class="payment-row">
                                    <span>Payroll ID:</span>
                                    <span id="payment-payroll-id">Loading...</span>
                                </div>
                                <div class="payment-row">
                                    <span>Total Amount:</span>
                                    <span id="payment-total-amount" class="payment-amount">Loading...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Method Selection -->
                        <div class="payment-methods">
                            <h4>Select Payment Method</h4>
                            <div class="payment-options">
                                <div class="payment-option" data-method="card">
                                    <div class="payment-option-icon">
                                        <i class="fas fa-credit-card"></i>
                                    </div>
                                    <div class="payment-option-text">
                                        <h5>Credit / Debit Card</h5>
                                        <p>Pay securely with your card</p>
                                    </div>
                                    <div class="payment-option-radio">
                                        <input type="radio" name="payment-method" value="card" id="card-payment">
                                        <label for="card-payment"></label>
                                    </div>
                                </div>

                                <div class="payment-option" data-method="revolut">
                                    <div class="payment-option-icon">
                                        <i class="fas fa-mobile-alt"></i>
                                    </div>
                                    <div class="payment-option-text">
                                        <h5>Revolut</h5>
                                        <p>Pay with Revolut app</p>
                                    </div>
                                    <div class="payment-option-radio">
                                        <input type="radio" name="payment-method" value="revolut" id="revolut-payment">
                                        <label for="revolut-payment"></label>
                                    </div>
                                </div>

                                <div class="payment-option" data-method="paypal">
                                    <div class="payment-option-icon">
                                        <i class="fab fa-paypal"></i>
                                    </div>
                                    <div class="payment-option-text">
                                        <h5>PayPal</h5>
                                        <p>Pay with PayPal account</p>
                                    </div>
                                    <div class="payment-option-radio">
                                        <input type="radio" name="payment-method" value="paypal" id="paypal-payment">
                                        <label for="paypal-payment"></label>
                                    </div>
                                </div>

                                <div class="payment-option" data-method="bank">
                                    <div class="payment-option-icon">
                                        <i class="fas fa-university"></i>
                                    </div>
                                    <div class="payment-option-text">
                                        <h5>Direct Bank Transfer</h5>
                                        <p>Transfer directly to bank account</p>
                                    </div>
                                    <div class="payment-option-radio">
                                        <input type="radio" name="payment-method" value="bank" id="bank-payment">
                                        <label for="bank-payment"></label>
                                    </div>
                                </div>

                                <div class="payment-option" data-method="iban">
                                    <div class="payment-option-icon">
                                        <i class="fas fa-euro-sign"></i>
                                    </div>
                                    <div class="payment-option-text">
                                        <h5>IBAN Transfer</h5>
                                        <p>Pay using your IBAN account</p>
                                    </div>
                                    <div class="payment-option-radio">
                                        <input type="radio" name="payment-method" value="iban" id="iban-payment">
                                        <label for="iban-payment"></label>
                                    </div>
                                </div>

                                <div class="payment-option" data-method="stripe">
                                    <div class="payment-option-icon">
                                        <i class="fab fa-stripe"></i>
                                    </div>
                                    <div class="payment-option-text">
                                        <h5>Stripe Payment</h5>
                                        <p>Secure payment via Stripe</p>
                                    </div>
                                    <div class="payment-option-radio">
                                        <input type="radio" name="payment-method" value="stripe" id="stripe-payment">
                                        <label for="stripe-payment"></label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Forms -->
                        <div class="payment-forms">
                            <!-- Card Payment Form -->
                            <div id="card-payment-form" class="payment-form" style="display: none;">
                                <div class="card-container">
                                    <div class="card-front">
                                        <div class="card-header">
                                            <div class="card-chip"></div>
                                            <div class="card-brand">VISA</div>
                                        </div>
                                        <div class="card-number">
                                            <input type="text" id="card-number" placeholder="1234 5678 9012 3456" maxlength="19">
                                        </div>
                                        <div class="card-info">
                                            <div class="card-holder">
                                                <label>Card Holder</label>
                                                <input type="text" id="card-holder" placeholder="JOHN DOE">
                                            </div>
                                            <div class="card-expiry">
                                                <label>Expires</label>
                                                <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="card-back">
                                        <div class="card-stripe"></div>
                                        <div class="card-cvv">
                                            <label>CVV</label>
                                            <input type="text" id="card-cvv" placeholder="123" maxlength="3">
                                        </div>
                                    </div>
                                </div>
                                <div class="card-flip-indicator">
                                    <i class="fas fa-info-circle"></i>
                                    <span>Click on the card to flip and enter CVV</span>
                                    <i class="fas fa-arrow-right flip-arrow"></i>
                                </div>
                            </div>

                            <!-- Bank Transfer Form -->
                            <div id="bank-payment-form" class="payment-form" style="display: none;">
                                <div class="bank-details">
                                    <h5>Bank Transfer Details</h5>
                                    <div class="bank-info">
                                        <div class="bank-row">
                                            <span>Bank Name:</span>
                                            <span>Chronos HR Bank</span>
                                        </div>
                                        <div class="bank-row">
                                            <span>Account Number:</span>
                                            <span>1234 5678 9012 3456</span>
                                        </div>
                                        <div class="bank-row">
                                            <span>IBAN:</span>
                                            <span>GB29 NWBK 6016 1331 9268 19</span>
                                        </div>
                                        <div class="bank-row">
                                            <span>SWIFT/BIC:</span>
                                            <span>NWBKGB2L</span>
                                        </div>
                                        <div class="bank-row">
                                            <span>Reference:</span>
                                            <span id="bank-reference">Loading...</span>
                                        </div>
                                    </div>
                                    <div class="bank-note">
                                        <i class="fas fa-info-circle"></i>
                                        Please include the reference number when making the transfer
                                    </div>
                                </div>
                            </div>

                            <!-- IBAN Payment Form -->
                            <div id="iban-payment-form" class="payment-form" style="display: none;">
                                <div class="iban-details">
                                    <h5>IBAN Transfer Details</h5>
                                    <div class="iban-info">
                                        <div class="iban-row">
                                            <span>Your IBAN:</span>
                                            <span id="user-iban">Loading...</span>
                                        </div>
                                        <div class="iban-row">
                                            <span>Bank Name:</span>
                                            <span id="user-bank-name">Loading...</span>
                                        </div>
                                        <div class="iban-row">
                                            <span>Account Holder:</span>
                                            <span id="user-account-holder">Loading...</span>
                                        </div>
                                        <div class="iban-row">
                                            <span>Reference:</span>
                                            <span id="iban-reference">Loading...</span>
                                        </div>
                                    </div>
                                    <div class="iban-note">
                                        <i class="fas fa-info-circle"></i>
                                        Payment will be processed using your configured IBAN account
                                    </div>
                                </div>
                            </div>

                            <!-- Stripe Payment Form -->
                            <div id="stripe-payment-form" class="payment-form" style="display: none;">
                                <div class="stripe-details">
                                    <h5>Stripe Payment</h5>
                                    <div class="stripe-info">
                                        <div class="stripe-row">
                                            <span>Payment Gateway:</span>
                                            <span>Stripe</span>
                                        </div>
                                        <div class="stripe-row">
                                            <span>Security:</span>
                                            <span>PCI DSS Compliant</span>
                                        </div>
                                        <div class="stripe-row">
                                            <span>Reference:</span>
                                            <span id="stripe-reference">Loading...</span>
                                        </div>
                                    </div>
                                    <div class="stripe-card-container">
                                        <label for="stripe-card-element">Card Information</label>
                                        <div id="stripe-card-element" class="stripe-card-element"></div>
                                        <div id="stripe-card-errors" class="stripe-card-errors" role="alert"></div>
                                    </div>
                                    <div class="stripe-note">
                                        <i class="fas fa-shield-alt"></i>
                                        Your payment information is securely processed by Stripe
                                    </div>
                                </div>
                            </div>

                            <!-- External Payment Forms -->
                            <div id="external-payment-form" class="payment-form" style="display: none;">
                                <div class="external-payment-info">
                                    <div class="external-payment-icon">
                                        <i id="external-payment-icon" class="fas fa-external-link-alt"></i>
                                    </div>
                                    <h5 id="external-payment-title">Redirecting to Payment</h5>
                                    <p id="external-payment-description">You will be redirected to complete your payment securely.</p>
                                    <button class="btn-primary" id="proceed-external-payment">
                                        <i class="fas fa-external-link-alt"></i>
                                        Proceed to Payment
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Actions -->
                        <div class="payment-actions">
                            <button type="button" class="btn-secondary" onclick="payrollManager.closePaymentModal()">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="button" class="btn-primary" id="process-payment-btn" onclick="payrollManager.processPayment()">
                                <i class="fas fa-lock"></i> Process Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup payment method selection
        this.setupPaymentMethodSelection();
        
        // Setup card flip functionality
        this.setupCardFlip();
        
        // Initialize Stripe card element
        this.initializeStripeCard();
    }

    async initializeStripeCard() {
        try {
            // Get Stripe configuration
            const configResponse = await fetch('/api/stripe/config');
            const config = await configResponse.json();
            
            // Load Stripe.js if not already loaded
            if (!window.Stripe) {
                const script = document.createElement('script');
                script.src = 'https://js.stripe.com/v3/';
                script.onload = () => this.createStripeCardElement(config.publishableKey);
                document.head.appendChild(script);
            } else {
                this.createStripeCardElement(config.publishableKey);
            }
        } catch (error) {
            console.error('Error initializing Stripe card:', error);
        }
    }

    createStripeCardElement(publishableKey) {
        try {
            const stripe = Stripe(publishableKey);
            const elements = stripe.elements();
            
            // Create card element
            this.cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                            color: '#aab7c4',
                        },
                    },
                    invalid: {
                        color: '#9e2146',
                    },
                },
            });
            
            // Mount the card element
            const cardElementContainer = document.getElementById('stripe-card-element');
            if (cardElementContainer) {
                this.cardElement.mount('#stripe-card-element');
                
                // Handle real-time validation errors
                this.cardElement.on('change', ({error}) => {
                    const displayError = document.getElementById('stripe-card-errors');
                    if (error) {
                        displayError.textContent = error.message;
                    } else {
                        displayError.textContent = '';
                    }
                });
            }
        } catch (error) {
            console.error('Error creating Stripe card element:', error);
        }
    }

    populatePaymentDetails() {
        const modal = document.getElementById('payment-modal');
        if (!modal) return;

        const employeeNameElement = modal.querySelector('#payment-employee-name');
        const payrollIdElement = modal.querySelector('#payment-payroll-id');
        const totalAmountElement = modal.querySelector('#payment-total-amount');

        if (employeeNameElement) {
            const employee = this.currentPaymentPayroll.employee || {};
            employeeNameElement.textContent = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
        }

        if (payrollIdElement) {
            payrollIdElement.textContent = this.currentPaymentPayroll.payroll_id;
        }

        if (totalAmountElement) {
            totalAmountElement.textContent = `$${this.currentPaymentPayroll.total_amount?.toLocaleString() || '0'}`;
        }
    }

    setupPaymentMethodSelection() {
        const paymentOptions = document.querySelectorAll('.payment-option');
        const cardPaymentForm = document.getElementById('card-payment-form');
        const bankPaymentForm = document.getElementById('bank-payment-form');
        const ibanPaymentForm = document.getElementById('iban-payment-form');
        const stripePaymentForm = document.getElementById('stripe-payment-form');
        const externalPaymentForm = document.getElementById('external-payment-form');

        paymentOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            const method = option.getAttribute('data-method');

            option.addEventListener('click', () => {
                // Uncheck all radios
                document.querySelectorAll('input[name="payment-method"]').forEach(r => r.checked = false);
                // Check the clicked radio
                radio.checked = true;
                
                // Remove selected class from all options
                paymentOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                option.classList.add('selected');

                // Hide all forms
                cardPaymentForm.style.display = 'none';
                bankPaymentForm.style.display = 'none';
                ibanPaymentForm.style.display = 'none';
                stripePaymentForm.style.display = 'none';
                externalPaymentForm.style.display = 'none';

                // Show appropriate form
                if (method === 'card') {
                    cardPaymentForm.style.display = 'block';
                } else if (method === 'bank') {
                    bankPaymentForm.style.display = 'block';
                    // Generate bank reference
                    const bankReference = `BANK${Date.now().toString().slice(-8)}`;
                    const bankReferenceElement = document.getElementById('bank-reference');
                    if (bankReferenceElement) {
                        bankReferenceElement.textContent = bankReference;
                    }
                } else if (method === 'iban') {
                    ibanPaymentForm.style.display = 'block';
                    // Populate IBAN details
                    const userIbanElement = document.getElementById('user-iban');
                    const userBankNameElement = document.getElementById('user-bank-name');
                    const userAccountHolderElement = document.getElementById('user-account-holder');
                    const ibanReferenceElement = document.getElementById('iban-reference');

                    const user = this.getCurrentUser();
                    if (user) {
                        userIbanElement.textContent = user.iban || 'Not available';
                        userBankNameElement.textContent = user.bank_name || 'Not available';
                        userAccountHolderElement.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                        const ibanReference = `IBAN${Date.now().toString().slice(-8)}`;
                        ibanReferenceElement.textContent = ibanReference;
                    } else {
                        userIbanElement.textContent = 'N/A';
                        userBankNameElement.textContent = 'N/A';
                        userAccountHolderElement.textContent = 'N/A';
                        ibanReferenceElement.textContent = 'N/A';
                    }
                } else if (method === 'stripe') {
                    stripePaymentForm.style.display = 'block';
                    const stripeReferenceElement = document.getElementById('stripe-reference');
                    const stripeTokenInput = document.getElementById('stripe-token');

                    const user = this.getCurrentUser();
                    if (user) {
                        stripeReferenceElement.textContent = `Stripe${Date.now().toString().slice(-8)}`;
                        stripeTokenInput.value = user.stripe_token || ''; // Assuming stripe_token is stored in user profile
                    } else {
                        stripeReferenceElement.textContent = 'N/A';
                        stripeTokenInput.value = '';
                    }
                } else if (method === 'revolut' || method === 'paypal') {
                    externalPaymentForm.style.display = 'block';
                    const icon = document.getElementById('external-payment-icon');
                    const title = document.getElementById('external-payment-title');
                    const description = document.getElementById('external-payment-description');
                    
                    if (method === 'revolut') {
                        icon.className = 'fas fa-mobile-alt';
                        title.textContent = 'Redirecting to Revolut';
                        description.textContent = 'You will be redirected to the Revolut app to complete your payment securely.';
                    } else {
                        icon.className = 'fab fa-paypal';
                        title.textContent = 'Redirecting to PayPal';
                        description.textContent = 'You will be redirected to PayPal to complete your payment securely.';
                    }
                }
            });
        });
    }

    setupCardFlip() {
        const cardContainer = document.querySelector('.card-container');
        const cardFront = document.querySelector('.card-front');
        const cardBack = document.querySelector('.card-back');
        const cardNumberInput = document.getElementById('card-number');
        const cardCvvInput = document.getElementById('card-cvv');

        if (cardContainer && cardFront && cardBack && cardNumberInput && cardCvvInput) {
            // Card number formatting
            cardNumberInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '');
                value = value.replace(/\D/g, '');
                value = value.replace(/(\d{4})/g, '$1 ').trim();
                e.target.value = value.substring(0, 19);
            });

            // Expiry date formatting
            const cardExpiryInput = document.getElementById('card-expiry');
            if (cardExpiryInput) {
                cardExpiryInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                        value = value.substring(0, 2) + '/' + value.substring(2, 4);
                    }
                    e.target.value = value.substring(0, 5);
                });
            }

            // CVV formatting
            cardCvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
            });

            // Prevent card flip when clicking on input fields
            const cardInputs = [cardNumberInput, cardCvvInput, cardExpiryInput, document.getElementById('card-holder')];
            cardInputs.forEach(input => {
                if (input) {
                    input.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    input.addEventListener('focus', (e) => {
                        e.stopPropagation();
                    });
                }
            });

            // Card flip functionality - only when clicking on non-input areas
            cardFront.addEventListener('click', (e) => {
                // Only flip if not clicking on an input field
                if (!e.target.matches('input, label')) {
                    cardFront.style.transform = 'rotateY(180deg)';
                    cardBack.style.transform = 'rotateY(0deg)';
                    cardCvvInput.focus();
                }
            });

            cardBack.addEventListener('click', (e) => {
                // Only flip if not clicking on an input field
                if (!e.target.matches('input, label')) {
                    cardBack.style.transform = 'rotateY(180deg)';
                    cardFront.style.transform = 'rotateY(0deg)';
                    cardNumberInput.focus();
                }
            });

            // Focus on card number when card form is shown
            cardNumberInput.focus();
        }
    }

    closePaymentModal() {
        document.getElementById('payment-modal').style.display = 'none';
        this.currentPaymentPayroll = null; // Clear current payment payroll
    }

    processPayment() {
        console.log('💰 Processing payment...');
        const selectedMethod = document.querySelector('input[name="payment-method"]:checked').value;
        const paymentForm = document.getElementById(`${selectedMethod}-payment-form`);
        const paymentTotalAmount = parseFloat(document.getElementById('payment-total-amount').textContent.replace('$', '').replace(',', ''));

        if (!this.currentPaymentPayroll) {
            this.showToast('No payroll selected for payment.', 'error');
            return;
        }

        if (paymentForm) {
            if (selectedMethod === 'card') {
                this.processCardPayment(paymentTotalAmount);
            } else if (selectedMethod === 'bank') {
                this.processBankPayment(paymentTotalAmount);
            } else if (selectedMethod === 'revolut') {
                this.processRevolutPayment(paymentTotalAmount);
            } else if (selectedMethod === 'paypal') {
                this.processPaypalPayment(paymentTotalAmount);
            } else if (selectedMethod === 'iban') {
                this.processIbanPayment(paymentTotalAmount);
            } else if (selectedMethod === 'stripe') {
                this.processStripePayment(paymentTotalAmount);
            }
        } else {
            this.showToast('Payment method not selected or form not found.', 'error');
        }
    }

    async processCardPayment(amount) {
        console.log('💳 Processing Card Payment...');
        const cardNumber = document.getElementById('card-number').value;
        const cardHolder = document.getElementById('card-holder').value;
        const cardExpiry = document.getElementById('card-expiry').value;
        const cardCvv = document.getElementById('card-cvv').value;

        if (!cardNumber || !cardHolder || !cardExpiry || !cardCvv) {
            this.showToast('Please fill in all card details.', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/proceed-to-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_method: 'card',
                    card_number: cardNumber,
                    card_holder: cardHolder,
                    card_expiry: cardExpiry,
                    card_cvv: cardCvv
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process payment');
            }

            const data = await response.json();
            console.log('✅ Payment processed successfully:', data);
            this.showToast('Payment processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing payment:', error);
            this.showToast(error.message, 'error');
        }
    }

    async processBankPayment(amount) {
        console.log('💳 Processing Bank Transfer...');
        const bankReference = document.getElementById('bank-reference').textContent;

        if (!bankReference) {
            this.showToast('Bank reference not available.', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/proceed-to-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_method: 'bank',
                    bank_reference: bankReference
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process payment');
            }

            const data = await response.json();
            console.log('✅ Payment processed successfully:', data);
            this.showToast('Payment processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing payment:', error);
            this.showToast(error.message, 'error');
        }
    }

    async processRevolutPayment(amount) {
        console.log('💳 Processing Revolut Payment...');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/proceed-to-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_method: 'revolut'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process payment');
            }

            const data = await response.json();
            console.log('✅ Payment processed successfully:', data);
            this.showToast('Revolut payment processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing payment:', error);
            this.showToast(error.message, 'error');
        }
    }

    async processPaypalPayment(amount) {
        console.log('💳 Processing PayPal Payment...');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/proceed-to-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_method: 'paypal'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process payment');
            }

            const data = await response.json();
            console.log('✅ Payment processed successfully:', data);
            this.showToast('PayPal payment processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing payment:', error);
            this.showToast(error.message, 'error');
        }
    }

    async processIbanPayment(amount) {
        console.log('💳 Processing IBAN Payment...');
        const iban = document.getElementById('user-iban').textContent; // Use the populated IBAN from the form

        if (!iban) {
            this.showToast('IBAN not available for payment.', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/proceed-to-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payment_method: 'iban',
                    iban: iban
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process payment');
            }

            const data = await response.json();
            console.log('✅ Payment processed successfully:', data);
            this.showToast('IBAN payment processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing payment:', error);
            this.showToast(error.message, 'error');
        }
    }

    async processStripePayment(amount) {
        console.log('💳 Processing Stripe Payment...');
        
        try {
            // First, create a payment intent
            const createIntentResponse = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const intentResult = await createIntentResponse.json();
            
            if (!intentResult.paymentIntent) {
                this.showToast('Failed to create payment intent.', 'error');
                return;
            }
            
            // Get Stripe configuration
            const configResponse = await fetch('/api/stripe/config');
            const config = await configResponse.json();
            
            // Load Stripe.js
            if (!window.Stripe) {
                const script = document.createElement('script');
                script.src = 'https://js.stripe.com/v3/';
                script.onload = () => this.initializeStripePayment(config.publishableKey, intentResult.paymentIntent);
                document.head.appendChild(script);
            } else {
                this.initializeStripePayment(config.publishableKey, intentResult.paymentIntent);
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            this.showToast('Payment processing failed.', 'error');
        }
    }

    async initializeStripePayment(publishableKey, paymentIntent) {
        try {
            const stripe = Stripe(publishableKey);
            
            // Create payment method
            const { paymentMethod, error } = await stripe.createPaymentMethod({
                type: 'card',
                card: this.cardElement,
                billing_details: {
                    name: this.currentEmployeeName || 'Employee Payment'
                }
            });
            
            if (error) {
                this.showToast(`Payment method error: ${error.message}`, 'error');
                return;
            }
            
            // Process the payment
            const response = await fetch(`/api/payroll/${this.currentPaymentPayroll.id}/process-stripe-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    paymentIntentId: paymentIntent.id,
                    paymentMethodId: paymentMethod.id
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Stripe payment processed successfully!', 'success');
                this.closePaymentModal();
                this.loadPayrolls(); // Refresh the payroll list
            } else {
                this.showToast(result.error || 'Payment failed.', 'error');
            }
            
        } catch (error) {
            console.error('Stripe payment error:', error);
            this.showToast('Payment processing failed.', 'error');
        }
    }
}

// Initialize the payroll manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.payrollManager = new PayrollManager();
    
    // Add a manual test function for debugging
    window.testNewPayroll = function() {
        console.log('🧪 Manual test triggered');
        if (window.payrollManager) {
            window.payrollManager.showNewPayrollModal();
        } else {
            console.log('❌ PayrollManager not initialized');
        }
    };
    
    // Add a global function to show the button for testing
    window.showPayrollButton = function() {
        const btn = document.querySelector('.new-payroll-btn');
        if (btn) {
            btn.style.display = 'flex';
            console.log('✅ Button manually shown for testing');
        }
    };

    // Test function for debugging
    window.testNewPayroll = function() {
        console.log('🧪 Test function called');
        if (window.payrollManager) {
            console.log('✅ PayrollManager found, testing employee loading...');
            window.payrollManager.loadEmployees();
        } else {
            console.error('❌ PayrollManager not found');
        }
    };

    // Test function for employee loading
    window.testLoadEmployees = function() {
        console.log('🧪 Testing employee loading...');
        if (window.payrollManager) {
            window.payrollManager.loadEmployees();
        } else {
            console.error('❌ PayrollManager not found');
        }
    };
}); 