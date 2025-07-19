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
            this.initializeCharts();
            
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
            console.log('✅ Payrolls loaded:', this.payrolls.length);
            console.log('📋 Payrolls data:', this.payrolls);
            
            this.displayPayrolls();
            
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
            
            // Update KPI cards
            this.updateKPICards(stats);
            
        } catch (error) {
            console.error('❌ Error loading payroll stats:', error);
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
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">
                        <div class="no-data-content">
                            <i class="fas fa-file-invoice-dollar"></i>
                            <p>No payrolls found</p>
                            <small>Create your first payroll to get started</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.payrolls.map(payroll => {
            const employee = payroll.employee;
            const initials = this.getInitials(`${employee.first_name} ${employee.last_name}`);
            const formattedDate = this.formatDate(payroll.created_at);
            const statusClass = payroll.status === 'completed' ? 'completed' : 'pending';
            const statusText = payroll.status === 'completed' ? 'Completed' : 'Pending';
            
            // Add payment button for pending payrolls
            const actionButtons = payroll.status === 'pending' 
                ? `
                    <div class="action-buttons">
                        <button class="btn-payment" onclick="payrollManager.proceedToPayment('${payroll.id}')" title="Proceed to Payment">
                            <i class="fas fa-credit-card"></i>
                        </button>
                        <i class="fas fa-eye action-icon" onclick="payrollManager.viewPayroll('${payroll.id}')" title="View Details"></i>
                        <i class="fas fa-ellipsis-v action-icon" onclick="payrollManager.showActionMenu(this, '${payroll.id}')" title="More Options"></i>
                    </div>
                `
                : `
                    <div class="action-buttons">
                        <i class="fas fa-eye action-icon" onclick="payrollManager.viewPayroll('${payroll.id}')" title="View Details"></i>
                        <i class="fas fa-ellipsis-v action-icon" onclick="payrollManager.showActionMenu(this, '${payroll.id}')" title="More Options"></i>
                    </div>
                `;

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
        console.log('🔍 User profile:', this.userProfile);
        
        const newPayrollBtn = document.querySelector('.new-payroll-btn');
        console.log('🔍 Found new-payroll-btn:', newPayrollBtn);
        console.log('🔍 Button display style before:', newPayrollBtn?.style.display);
        
        if (newPayrollBtn) {
            // For testing purposes, always show the button initially
            // In production, this should be controlled by role
            if (this.isAdmin || !this.userProfile) {
                console.log('✅ User is admin or profile not loaded - showing new payroll button');
                newPayrollBtn.style.display = 'flex';
                console.log('🔍 Button display style after:', newPayrollBtn.style.display);
                
                // Add visual debugging to button
                newPayrollBtn.style.border = '2px solid green';
                newPayrollBtn.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
                
                // Remove any existing event listeners to prevent duplicates
                newPayrollBtn.removeEventListener('click', this.showNewPayrollModal);
                newPayrollBtn.addEventListener('click', () => {
                    console.log('🖱️ New Payroll button clicked!');
                    this.showNewPayrollModal();
                });
                console.log('✅ Event listener added to new payroll button');
                
                // Remove debugging styles after 3 seconds
                setTimeout(() => {
                    newPayrollBtn.style.border = '';
                    newPayrollBtn.style.backgroundColor = '';
                }, 3000);
            } else {
                console.log('❌ User is not admin - hiding new payroll button');
                newPayrollBtn.style.display = 'none';
            }
        } else {
            console.log('❌ new-payroll-btn not found in DOM');
            // Retry after a short delay in case DOM is not ready
            setTimeout(() => {
                console.log('🔄 Retrying to find new-payroll-btn...');
                this.setupRoleBasedUI();
            }, 1000);
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
            modal.style.border = '3px solid red';
            modal.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            
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
        // Implementation for admin action menu
        console.log('⚙️ Showing action menu for payroll:', payrollId);
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

    initializeCharts() {
        // Initialize charts if they exist
        const chartCanvas = document.getElementById('payrollChart');
        if (chartCanvas) {
            this.initializePayrollChart();
        }

        const bonusesCanvas = document.getElementById('bonusesChart');
        if (bonusesCanvas) {
            this.initializeBonusesChart();
        }
    }

    initializePayrollChart() {
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

        const ctx = canvas.getContext('2d');
        window.payrollChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Payroll Cost',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: [8000, 12000, 10000, 18000, 15000, 22000],
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    tension: 0.4
                }]
            },
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

    initializeBonusesChart() {
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

        const ctx = canvas.getContext('2d');
        window.bonusesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Bonuses', 'Incentives'],
                datasets: [{
                    data: [5100, 5400],
                    backgroundColor: ['#667eea', '#764ba2'],
                    borderWidth: 0
                }]
            },
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
                                    Click on the card to flip and enter CVV
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

            // Card flip functionality
            cardFront.addEventListener('click', () => {
                cardFront.style.transform = 'rotateY(180deg)';
                cardBack.style.transform = 'rotateY(0deg)';
                cardCvvInput.focus();
            });

            cardBack.addEventListener('click', () => {
                cardBack.style.transform = 'rotateY(180deg)';
                cardFront.style.transform = 'rotateY(0deg)';
                cardNumberInput.focus();
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
            const response = await fetch('/api/payment/card', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payroll_id: this.currentPaymentPayroll.id,
                    amount: amount,
                    card_number: cardNumber,
                    card_holder: cardHolder,
                    card_expiry: cardExpiry,
                    card_cvv: cardCvv
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process card payment');
            }

            const data = await response.json();
            console.log('✅ Card payment processed successfully:', data);
            this.showToast('Card payment processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing card payment:', error);
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
            const response = await fetch('/api/payment/bank', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    payroll_id: this.currentPaymentPayroll.id,
                    amount: amount,
                    bank_reference: bankReference
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process bank transfer');
            }

            const data = await response.json();
            console.log('✅ Bank transfer processed successfully:', data);
            this.showToast('Bank transfer processed successfully!', 'success');
            this.closePaymentModal();
            await this.loadPayrolls(); // Refresh payroll list to update status
        } catch (error) {
            console.error('❌ Error processing bank transfer:', error);
            this.showToast(error.message, 'error');
        }
    }

    async processRevolutPayment(amount) {
        console.log('�� Processing Revolut Payment...');
        // In a real application, you would redirect to a Revolut payment page
        // For demonstration, we'll just show a toast
        this.showToast('Revolut payment selected. Redirecting to Revolut app...', 'info');
        // Example: window.location.href = '/revolut-payment-redirect';
    }

    async processPaypalPayment(amount) {
        console.log('💳 Processing PayPal Payment...');
        // In a real application, you would redirect to a PayPal payment page
        // For demonstration, we'll just show a toast
        this.showToast('PayPal payment selected. Redirecting to PayPal...', 'info');
        // Example: window.location.href = '/paypal-payment-redirect';
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