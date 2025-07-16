// Users Page JavaScript
class UsersPage {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentView = 'table';
        this.filters = {
            search: '',
            department: '',
            role: '',
            status: ''
        };
        this.init();
    }

    async init() {
        console.log('🚀 Users page initializing...');
        
        // Setup sidebar and event listeners first
        this.setupSidebar();
        this.setupEventListeners();
        
        try {
            await this.checkAuth();
            console.log('✅ Auth check completed');
            
            await this.loadEmployees();
            console.log('✅ Employees loaded');
            
            this.updateStats();
            console.log('✅ Stats updated');
            
            console.log('✅ Users page initialization complete');
        } catch (error) {
            console.error('❌ Users page initialization failed:', error);
            this.showToast('Failed to load employees', 'error');
        }
    }

    setupSidebar() {
        // Standalone sidebar toggle - works independently
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
    }

    async checkAuth() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('🔐 No authentication token found, redirecting to login...');
                window.location.href = '/';
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
            console.log('✅ Authentication successful:', this.currentUser);
        } catch (error) {
            console.error('Auth check failed:', error);
            console.log('🔐 Redirecting to login due to auth failure...');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/';
        }
    }

    async loadEmployees() {
        try {
            console.log('📊 Loading employees...');
            const token = localStorage.getItem('token');
            
            // Require authentication
            if (!token) {
                console.log('📊 No authentication token found, redirecting to login...');
                window.location.href = '/';
                return;
            }
            
            const response = await this.retryRequest(async () => {
                return await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = await response.json();
                    throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 30} seconds.`);
                }
                throw new Error('Failed to fetch employees');
            }
            
            const data = await response.json();
            this.employees = data.users || [];
            console.log('📊 Employees loaded:', this.employees.length);
            
            this.applyFilters();
            this.renderEmployees();
            this.updatePagination();
            
        } catch (error) {
            console.error('❌ Failed to load employees:', error);
            this.showToast(error.message, 'error');
            
            // If it's an authentication error, redirect to login
            if (error.message.includes('Authentication failed') || error.message.includes('Access token required')) {
                console.log('🔐 Authentication error, redirecting to login...');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/';
                return;
            }
            
            // For other errors, show the error message
            this.showToast('Failed to load employees. Please try again.', 'error');
        }
    }

    async retryRequest(requestFn, maxRetries = 3) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`🔄 Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                await this.sleep(delay);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadSampleData() {
        console.log('📊 Loading sample data...');
        this.employees = [
            {
                id: '1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@company.com',
                department: 'engineering',
                role: 'manager',
                status: 'active',
                phone: '+1 (555) 123-4567',
                hire_date: '2023-01-15',
                performance: 85,
                invite_code: 'ABC12345',
                invite_code_expires_at: '2024-12-31T23:59:59Z',
                invite_sent_at: '2024-01-15T10:00:00Z',
                profile_id: null
            },
            {
                id: '2',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@company.com',
                department: 'marketing',
                role: 'employee',
                status: 'active',
                phone: '+1 (555) 234-5678',
                hire_date: '2023-03-20',
                performance: 92,
                invite_code: 'DEF67890',
                invite_code_expires_at: '2024-12-31T23:59:59Z',
                invite_sent_at: null,
                profile_id: null
            },
            {
                id: '3',
                first_name: 'Mike',
                last_name: 'Johnson',
                email: 'mike.johnson@company.com',
                department: 'sales',
                role: 'manager',
                status: 'active',
                phone: '+1 (555) 345-6789',
                hire_date: '2022-11-10',
                performance: 78,
                invite_code: null,
                invite_code_expires_at: null,
                invite_sent_at: null,
                profile_id: null
            },
            {
                id: '4',
                first_name: 'Sarah',
                last_name: 'Wilson',
                email: 'sarah.wilson@company.com',
                department: 'hr',
                role: 'admin',
                status: 'active',
                phone: '+1 (555) 456-7890',
                hire_date: '2023-02-05',
                performance: 88,
                invite_code: 'GHI24680',
                invite_code_expires_at: '2024-12-31T23:59:59Z',
                invite_sent_at: '2024-01-20T14:30:00Z',
                profile_id: 'user-123' // This user has registered
            },
            {
                id: '5',
                first_name: 'David',
                last_name: 'Brown',
                email: 'david.brown@company.com',
                department: 'finance',
                role: 'employee',
                status: 'inactive',
                phone: '+1 (555) 567-8901',
                hire_date: '2023-04-12',
                performance: 65,
                invite_code: 'JKL13579',
                invite_code_expires_at: '2024-12-31T23:59:59Z',
                invite_sent_at: null,
                profile_id: null
            }
        ];
        
        this.applyFilters();
        this.renderEmployees();
        this.updatePagination();
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Search and filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            });
        }

        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', (e) => {
                this.filters.department = e.target.value;
                this.applyFilters();
            });
        }

        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.applyFilters();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // View toggle
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.closest('.view-btn').dataset.view;
                this.switchView(view);
            });
        });

        // Add employee button
        const addEmployeeBtn = document.getElementById('addEmployeeBtn');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => {
                this.showAddModal();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportEmployees();
            });
        }

        // Pagination
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.goToPage(this.currentPage - 1);
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.goToPage(this.currentPage + 1);
            });
        }

        // Modal event listeners
        this.setupModalEventListeners();
        
        console.log('✅ Event listeners setup complete');
    }

    setupModalEventListeners() {
        // Add employee modal
        const addModal = document.getElementById('addEmployeeModal');
        const closeAddModal = document.getElementById('closeAddModal');
        const cancelAdd = document.getElementById('cancelAdd');
        const addEmployeeForm = document.getElementById('addEmployeeForm');

        if (closeAddModal) {
            closeAddModal.addEventListener('click', () => this.hideModal(addModal));
        }
        if (cancelAdd) {
            cancelAdd.addEventListener('click', () => this.hideModal(addModal));
        }
        if (addEmployeeForm) {
            addEmployeeForm.addEventListener('submit', (e) => this.handleAddEmployee(e));
        }

        // Step form functionality
        this.setupStepForm();

        // Invite code generation in modal
        const generateInviteCodeBtn = document.getElementById('generateInviteCode');
        if (generateInviteCodeBtn) {
            generateInviteCodeBtn.addEventListener('click', () => {
                this.generateInviteCodeForModal();
            });
        }

        // Edit employee modal
        const editModal = document.getElementById('editEmployeeModal');
        const closeEditModal = document.getElementById('closeEditModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const editEmployeeForm = document.getElementById('editEmployeeForm');

        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => this.hideModal(editModal));
        }
        if (cancelEdit) {
            cancelEdit.addEventListener('click', () => this.hideModal(editModal));
        }
        if (editEmployeeForm) {
            editEmployeeForm.addEventListener('submit', (e) => this.handleEditEmployee(e));
        }

        // Delete confirmation modal
        const deleteModal = document.getElementById('deleteConfirmModal');
        const closeDeleteModal = document.getElementById('closeDeleteModal');
        const cancelDelete = document.getElementById('cancelDelete');
        const confirmDelete = document.getElementById('confirmDelete');

        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => this.hideModal(deleteModal));
        }
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.hideModal(deleteModal));
        }
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.handleDeleteEmployee());
        }

        // Close modals when clicking outside
        [addModal, editModal, deleteModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.hideModal(modal);
                    }
                });
            }
        });
    }

    setupStepForm() {
        const nextStepBtn = document.getElementById('nextStep');
        const prevStepBtn = document.getElementById('prevStep');
        const submitFormBtn = document.getElementById('submitForm');
        const radioOptions = document.querySelectorAll('.radio-option input[type="radio"]');
        const fileUploadZone = document.querySelector('.upload-zone');
        const removeFileBtns = document.querySelectorAll('.remove-file');

        // Step navigation
        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => this.nextStep());
        }
        if (prevStepBtn) {
            prevStepBtn.addEventListener('click', () => this.prevStep());
        }

        // Radio button selection
        radioOptions.forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Remove selected class from all options
                document.querySelectorAll('.radio-option').forEach(option => {
                    option.classList.remove('selected');
                });
                // Add selected class to current option
                e.target.closest('.radio-option').classList.add('selected');
            });
        });

        // File upload zone
        if (fileUploadZone) {
            fileUploadZone.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.jpg,.jpeg,.png';
                input.multiple = true;
                input.addEventListener('change', (e) => this.handleFileUpload(e));
                input.click();
            });

            // Drag and drop functionality
            fileUploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadZone.style.borderColor = '#4e8cff';
                fileUploadZone.style.background = '#eff6ff';
            });

            fileUploadZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadZone.style.borderColor = '#d1d5db';
                fileUploadZone.style.background = '#f9fafb';
            });

            fileUploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadZone.style.borderColor = '#d1d5db';
                fileUploadZone.style.background = '#f9fafb';
                this.handleFileUpload({ target: { files: e.dataTransfer.files } });
            });
        }

        // Remove file buttons
        removeFileBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileItem = btn.closest('.file-item');
                if (fileItem) {
                    fileItem.remove();
                }
            });
        });
    }

    nextStep() {
        const currentStep = document.querySelector('.form-step.active');
        const currentStepNumber = parseInt(currentStep.dataset.step);
        const nextStepNumber = currentStepNumber + 1;
        const nextStep = document.querySelector(`.form-step[data-step="${nextStepNumber}"]`);

        if (nextStep) {
            // Validate current step
            if (this.validateStep(currentStepNumber)) {
                // Hide current step
                currentStep.classList.remove('active');
                
                // Show next step
                nextStep.classList.add('active');
                
                // Update progress bar
                this.updateProgressBar(currentStepNumber, nextStepNumber);
                
                // Update buttons
                this.updateStepButtons(nextStepNumber);
            }
        }
    }

    prevStep() {
        const currentStep = document.querySelector('.form-step.active');
        const currentStepNumber = parseInt(currentStep.dataset.step);
        const prevStepNumber = currentStepNumber - 1;
        const prevStep = document.querySelector(`.form-step[data-step="${prevStepNumber}"]`);

        if (prevStep) {
            // Hide current step
            currentStep.classList.remove('active');
            
            // Show previous step
            prevStep.classList.add('active');
            
            // Update progress bar
            this.updateProgressBar(currentStepNumber, prevStepNumber);
            
            // Update buttons
            this.updateStepButtons(prevStepNumber);
        }
    }

    validateStep(stepNumber) {
        const currentStep = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
        const requiredFields = currentStep.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#ef4444';
                field.focus();
            } else {
                field.style.borderColor = '#e5e7eb';
            }
        });

        return isValid;
    }

    updateProgressBar(fromStep, toStep) {
        const stepItems = document.querySelectorAll('.step-item');
        const stepConnectors = document.querySelectorAll('.step-connector');

        stepItems.forEach((item, index) => {
            const stepNumber = index + 1;
            const stepIcon = item.querySelector('.step-icon');
            
            // Remove all existing classes
            item.classList.remove('active', 'completed');
            
            if (stepNumber < toStep) {
                // Completed steps
                item.classList.add('completed');
                stepIcon.innerHTML = '<i class="fas fa-check"></i>';
            } else if (stepNumber === toStep) {
                // Current step
                item.classList.add('active');
                stepIcon.innerHTML = `<span style="color: #ffffff; font-size: 0.9rem; font-weight: 600;">${stepNumber}</span>`;
            } else {
                // Pending steps
                stepIcon.innerHTML = '<i class="fas fa-check"></i>';
            }
        });

        stepConnectors.forEach((connector, index) => {
            const stepNumber = index + 1;
            
            // Remove all existing classes
            connector.classList.remove('active', 'completed');
            
            if (stepNumber < toStep) {
                // Fully completed - all green
                connector.classList.add('completed');
            } else if (stepNumber === toStep) {
                // Current step - half green, half gray
                connector.classList.add('active');
            }
            // Pending connectors get no special classes
        });
    }

    updateStepButtons(stepNumber) {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const submitBtn = document.getElementById('submitForm');

        if (stepNumber === 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
        } else if (stepNumber === 4) {
            prevBtn.style.display = 'inline-flex';
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-flex';
        } else {
            prevBtn.style.display = 'inline-flex';
            nextBtn.style.display = 'inline-flex';
            submitBtn.style.display = 'none';
        }
    }

    handleFileUpload(event) {
        const files = event.target.files;
        const uploadedFiles = document.querySelector('.uploaded-files');

        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <span>${file.name}</span>
                <button type="button" class="remove-file">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Add remove functionality
            const removeBtn = fileItem.querySelector('.remove-file');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileItem.remove();
            });

            uploadedFiles.appendChild(fileItem);
        });
    }

    applyFilters() {
        console.log('🔍 Applying filters...');
        let filtered = [...this.employees];

        // Search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(employee => 
                employee.first_name.toLowerCase().includes(searchTerm) ||
                employee.last_name.toLowerCase().includes(searchTerm) ||
                employee.email.toLowerCase().includes(searchTerm)
            );
        }

        // Department filter
        if (this.filters.department) {
            filtered = filtered.filter(employee => 
                employee.department === this.filters.department
            );
        }

        // Role filter
        if (this.filters.role) {
            filtered = filtered.filter(employee => 
                employee.role === this.filters.role
            );
        }

        // Status filter
        if (this.filters.status) {
            filtered = filtered.filter(employee => 
                employee.status === this.filters.status
            );
        }

        this.filteredEmployees = filtered;
        this.currentPage = 1; // Reset to first page when filtering
        console.log('🔍 Filtered employees:', this.filteredEmployees.length);
    }

    renderEmployees() {
        console.log('🎨 Rendering employees...');
        
        if (this.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderGridView();
        }
        
        this.updateEmployeeCount();
    }

    renderTableView() {
        const tbody = document.getElementById('employeesTableBody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageEmployees = this.filteredEmployees.slice(startIndex, endIndex);

        if (pageEmployees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <span>No employees found</span>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = pageEmployees.map(employee => `
            <tr>
                <td>
                    <input type="checkbox" class="employee-checkbox" value="${employee.id}">
                </td>
                <td>
                    <div class="employee-info">
                        <div class="employee-avatar">
                            ${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}
                        </div>
                        <div class="employee-details">
                            <div class="employee-name">${employee.first_name} ${employee.last_name}</div>
                            <div class="employee-email">${employee.email}</div>
                        </div>
                    </div>
                </td>
                <td>${employee.email}</td>
                <td>
                    ${employee.invite_code ? `
                        <div class="invite-code-container">
                            <div class="invite-code-display">
                                <code class="invite-code">${employee.invite_code}</code>
                                ${employee.profile_id ? 
                                    '<span class="invite-status registered">✓ Registered</span>' : 
                                    '<span class="invite-status pending">⏳ Pending</span>'
                                }
                            </div>
                            ${!employee.profile_id ? `
                                <div class="invite-actions">
                                    <button class="invite-btn regenerate" onclick="usersPage.regenerateInvite('${employee.id}')" title="Regenerate Code">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button class="invite-btn send" onclick="usersPage.sendInvite('${employee.id}')" title="Send Invite">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div class="invite-code-container">
                            <span class="no-invite">No invite code</span>
                            <button class="invite-btn generate" onclick="usersPage.generateInvite('${employee.id}')" title="Generate Code">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    `}
                </td>
                <td>
                    <span class="department-badge ${employee.department}">${employee.department}</span>
                </td>
                <td>
                    <span class="role-badge ${employee.role}">${employee.role}</span>
                </td>
                <td>
                    <span class="status-badge ${employee.status}">${employee.status}</span>
                </td>
                <td>
                    <div class="performance-bar">
                        <div class="performance-fill" style="width: ${employee.performance}%"></div>
                    </div>
                    <div class="performance-text">${employee.performance}%</div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="usersPage.viewEmployee('${employee.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="usersPage.editEmployee('${employee.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="usersPage.deleteEmployee('${employee.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderGridView() {
        const grid = document.getElementById('employeesGrid');
        if (!grid) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageEmployees = this.filteredEmployees.slice(startIndex, endIndex);

        if (pageEmployees.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6b7280;">
                    <span>No employees found</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = pageEmployees.map(employee => `
            <div class="employee-card">
                <div class="employee-card-header">
                    <div class="employee-card-avatar">
                        ${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}
                    </div>
                    <div class="employee-card-info">
                        <h4>${employee.first_name} ${employee.last_name}</h4>
                        <p>${employee.email}</p>
                    </div>
                </div>
                <div class="employee-card-details">
                    <div class="employee-card-detail">
                        <label>Department</label>
                        <span class="department-badge ${employee.department}">${employee.department}</span>
                    </div>
                    <div class="employee-card-detail">
                        <label>Role</label>
                        <span class="role-badge ${employee.role}">${employee.role}</span>
                    </div>
                    <div class="employee-card-detail">
                        <label>Status</label>
                        <span class="status-badge ${employee.status}">${employee.status}</span>
                    </div>
                    <div class="employee-card-detail">
                        <label>Performance</label>
                        <span>${employee.performance}%</span>
                    </div>
                </div>
                <div class="employee-card-actions">
                    <button class="btn btn-outline" onclick="usersPage.viewEmployee('${employee.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-outline" onclick="usersPage.editEmployee('${employee.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-outline" onclick="usersPage.deleteEmployee('${employee.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    switchView(view) {
        console.log('🔄 Switching to view:', view);
        this.currentView = view;
        
        // Update view buttons
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        // Show/hide containers
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');
        
        if (view === 'table') {
            tableView.classList.remove('hidden');
            gridView.classList.add('hidden');
        } else {
            tableView.classList.add('hidden');
            gridView.classList.remove('hidden');
        }

        this.renderEmployees();
    }

    async updateStats() {
        try {
            const token = localStorage.getItem('token');
            
            // If no token, use local stats
            if (!token) {
                console.log('📊 No token found, using local stats calculation...');
                this.updateStatsLocal();
                return;
            }
            
            const response = await this.retryRequest(async () => {
                return await fetch('/api/users/stats/overview', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            });
            
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalEmployeesCount').textContent = stats.totalUsers || 0;
                document.getElementById('activeEmployeesCount').textContent = stats.activeUsers || 0;
                document.getElementById('departmentsCount').textContent = stats.departments || 0;
                document.getElementById('avgPerformance').textContent = `${stats.attendanceRate || 0}%`;
            } else if (response.status === 429) {
                const errorData = await response.json();
                console.warn('Rate limited when fetching stats:', errorData);
                // Fall back to local calculation
                this.updateStatsLocal();
            } else {
                // Fall back to local calculation
                this.updateStatsLocal();
            }
        } catch (error) {
            console.error('Failed to update stats:', error);
            // Fall back to local calculation
            this.updateStatsLocal();
        }
    }

    updateStatsLocal() {
        const totalEmployees = this.employees.length;
        const activeEmployees = this.employees.filter(e => e.status === 'active').length;
        const departments = new Set(this.employees.map(e => e.department)).size;
        const avgPerformance = this.employees.length > 0 
            ? Math.round(this.employees.reduce((sum, e) => sum + e.performance, 0) / this.employees.length)
            : 0;

        document.getElementById('totalEmployeesCount').textContent = totalEmployees;
        document.getElementById('activeEmployeesCount').textContent = activeEmployees;
        document.getElementById('departmentsCount').textContent = departments;
        document.getElementById('avgPerformance').textContent = `${avgPerformance}%`;
    }

    updateEmployeeCount() {
        const countElement = document.getElementById('employeeCount');
        if (countElement) {
            countElement.textContent = `${this.filteredEmployees.length} employees`;
        }
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredEmployees.length);

        // Update pagination info
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${this.filteredEmployees.length} employees`;
        }

        // Update pagination buttons
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= totalPages;
        }

        // Update page numbers
        this.renderPageNumbers(totalPages);
    }

    renderPageNumbers(totalPages) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        if (!pageNumbersContainer) return;

        const pages = [];
        const maxVisiblePages = 5;
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (this.currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (this.currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        pageNumbersContainer.innerHTML = pages.map(page => {
            if (page === '...') {
                return '<span class="page-number">...</span>';
            }
            return `<button class="page-number ${page === this.currentPage ? 'active' : ''}" onclick="usersPage.goToPage(${page})">${page}</button>`;
        }).join('');
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredEmployees.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderEmployees();
            this.updatePagination();
        }
    }

    // Modal functions
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    hideModal(modal) {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    showAddModal() {
        this.showModal('addEmployeeModal');
        this.resetStepForm();
    }

    resetStepForm() {
        // Reset to first step
        const steps = document.querySelectorAll('.form-step');
        steps.forEach(step => step.classList.remove('active'));
        steps[0].classList.add('active');

        // Reset progress bar
        this.updateProgressBar(1, 1);

        // Reset buttons
        this.updateStepButtons(1);

        // Reset form fields
        const form = document.getElementById('addEmployeeForm');
        if (form) {
            form.reset();
        }

        // Reset radio selection
        document.querySelectorAll('.radio-option').forEach(option => {
            option.classList.remove('selected');
        });
        const firstRadio = document.querySelector('.radio-option input[type="radio"]');
        if (firstRadio) {
            firstRadio.checked = true;
            firstRadio.closest('.radio-option').classList.add('selected');
        }

        // Clear uploaded files
        const uploadedFiles = document.querySelector('.uploaded-files');
        if (uploadedFiles) {
            uploadedFiles.innerHTML = '';
        }

        // Reset validation styles
        document.querySelectorAll('.form-group input, .form-group select').forEach(field => {
            field.style.borderColor = '#e5e7eb';
        });

        // Clear invite code
        const inviteCodeInput = document.getElementById('inviteCode');
        if (inviteCodeInput) {
            inviteCodeInput.value = '';
        }
    }

    showEditModal(employee) {
        // Populate form fields
        document.getElementById('editEmployeeId').value = employee.id;
        document.getElementById('editFirstName').value = employee.first_name;
        document.getElementById('editLastName').value = employee.last_name;
        document.getElementById('editEmail').value = employee.email;
        document.getElementById('editDepartment').value = employee.department;
        document.getElementById('editRole').value = employee.role;
        document.getElementById('editPhone').value = employee.phone || '';
        document.getElementById('editStatus').value = employee.status;
        
        this.showModal('editEmployeeModal');
    }

    showDeleteModal(employee) {
        const deleteEmployeeInfo = document.getElementById('deleteEmployeeInfo');
        if (deleteEmployeeInfo) {
            deleteEmployeeInfo.innerHTML = `
                <strong>${employee.first_name} ${employee.last_name}</strong><br>
                <span>${employee.email}</span><br>
                <span>${employee.department} - ${employee.role}</span>
            `;
        }
        this.employeeToDelete = employee;
        this.showModal('deleteConfirmModal');
    }

    // Employee actions
    viewEmployee(id) {
        const employee = this.employees.find(e => e.id === id);
        if (employee) {
            this.showToast(`Viewing ${employee.first_name} ${employee.last_name}`, 'info');
            // TODO: Implement detailed view modal
        }
    }

    editEmployee(id) {
        const employee = this.employees.find(e => e.id === id);
        if (employee) {
            this.showEditModal(employee);
        }
    }

    deleteEmployee(id) {
        const employee = this.employees.find(e => e.id === id);
        if (employee) {
            this.showDeleteModal(employee);
        }
    }

    async handleAddEmployee(e) {
        e.preventDefault();
        
        // Check if we're on the final step
        const currentStep = document.querySelector('.form-step.active');
        const currentStepNumber = parseInt(currentStep.dataset.step);
        
        if (currentStepNumber < 4) {
            // If not on final step, go to next step
            this.nextStep();
            return;
        }
        
        // Only proceed with submission on final step
        const formData = new FormData(e.target);
        const employeeData = {
            first_name: formData.get('firstName'),
            last_name: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            employment_type: formData.get('employmentType'),
            job_title: formData.get('jobTitle'),
            department: formData.get('department'),
            work_location: formData.get('workLocation'),
            reporting_manager_id: null, // Set to null for now since we don't have proper UUIDs
            employee_status: formData.get('employeeStatus') || 'active',
            date_of_joining: formData.get('dateOfJoining'),
            salary: parseFloat(formData.get('salary')) || 0,
            currency: formData.get('currency') || 'EUR',
            pay_frequency: formData.get('payFrequency') || 'monthly',
            annual_bonus: parseFloat(formData.get('bonus')) || 0,
            benefits_package: formData.get('benefits') || null,
            work_schedule: formData.get('workSchedule') || 'full_time',
            work_days: formData.get('workDays') || 'monday-friday',
            break_time: formData.get('breakTime') || '1 hour',
            overtime_eligible: formData.get('overtimeEligible') === 'yes',
            terms_accepted: formData.get('termsAccepted') === 'on',
            is_active: true
        };

        try {
            const token = localStorage.getItem('token');
            
            // If no token, add to local array for demo
            if (!token) {
                console.log('📝 No authentication token found, adding to local array for demo...');
                const newEmployee = {
                    id: Date.now().toString(),
                    ...employeeData,
                    status: 'active',
                    performance: Math.floor(Math.random() * 30) + 70
                };
                
                this.employees.unshift(newEmployee);
                this.applyFilters();
                this.renderEmployees();
                this.updateStats();
                this.updatePagination();
                
                this.hideModal(document.getElementById('addEmployeeModal'));
                this.resetStepForm();
                this.showToast('Employee added successfully (demo mode)', 'success');
                return;
            }
            
            // Send to backend API
            console.log('📝 Creating employee via API...');
            const response = await this.retryRequest(async () => {
                return await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(employeeData)
                });
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = await response.json();
                    throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 30} seconds.`);
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create employee');
            }
            
            const result = await response.json();
            console.log('✅ Employee created successfully:', result);
            
            // Reload employees to get the updated list from the database
            await this.loadEmployees();
            
            this.hideModal(document.getElementById('addEmployeeModal'));
            this.resetStepForm();
            
            // Show success message with invite code
            if (result.inviteCode) {
                this.showToast(`Employee added successfully! Invite code: ${result.inviteCode} (sent to ${result.user.email})`, 'success');
            } else {
                this.showToast('Employee added successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ Failed to add employee:', error);
            this.showToast(error.message, 'error');
        }
    }

    async handleEditEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const employeeId = formData.get('id');
        const employeeData = {
            first_name: formData.get('firstName'),
            last_name: formData.get('lastName'),
            email: formData.get('email'),
            department: formData.get('department'),
            job_title: formData.get('jobTitle'),
            phone: formData.get('phone'),
            employment_type: formData.get('employmentType'),
            work_location: formData.get('workLocation'),
            reporting_manager_id: null, // Set to null for now since we don't have proper UUIDs
            employee_status: formData.get('employeeStatus'),
            salary: parseFloat(formData.get('salary')) || 0,
            currency: formData.get('currency') || 'EUR',
            pay_frequency: formData.get('payFrequency') || 'monthly',
            annual_bonus: parseFloat(formData.get('bonus')) || 0,
            benefits_package: formData.get('benefits') || null,
            work_schedule: formData.get('workSchedule') || 'full_time',
            work_days: formData.get('workDays') || 'monday-friday',
            break_time: formData.get('breakTime') || '1 hour',
            overtime_eligible: formData.get('overtimeEligible') === 'yes',
            is_active: formData.get('status') === 'active'
        };

        try {
            const token = localStorage.getItem('token');
            
            // If no token, update in local array for demo
            if (!token) {
                console.log('📝 No authentication token found, updating in local array for demo...');
                const index = this.employees.findIndex(e => e.id === employeeId);
                if (index !== -1) {
                    this.employees[index] = { ...this.employees[index], ...employeeData };
                    this.applyFilters();
                    this.renderEmployees();
                    this.updateStats();
                    
                    this.hideModal(document.getElementById('editEmployeeModal'));
                    this.showToast('Employee updated successfully (demo mode)', 'success');
                }
                return;
            }
            
            // Send to backend API
            console.log('📝 Updating employee via API...');
            const response = await this.retryRequest(async () => {
                return await fetch(`/api/users/${employeeId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(employeeData)
                });
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = await response.json();
                    throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 30} seconds.`);
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update employee');
            }
            
            const result = await response.json();
            console.log('✅ Employee updated successfully:', result);
            
            // Reload employees to get the updated list from the database
            await this.loadEmployees();
            
            this.hideModal(document.getElementById('editEmployeeModal'));
            this.showToast('Employee updated successfully', 'success');
            
        } catch (error) {
            console.error('❌ Failed to update employee:', error);
            this.showToast(error.message, 'error');
        }
    }

    async handleDeleteEmployee() {
        if (!this.employeeToDelete) return;

        try {
            const token = localStorage.getItem('token');
            
            // If no token, remove from local array for demo
            if (!token) {
                console.log('📝 No authentication token found, removing from local array for demo...');
                this.employees = this.employees.filter(e => e.id !== this.employeeToDelete.id);
                this.applyFilters();
                this.renderEmployees();
                this.updateStats();
                this.updatePagination();
                
                this.hideModal(document.getElementById('deleteConfirmModal'));
                this.showToast('Employee deleted successfully (demo mode)', 'success');
                this.employeeToDelete = null;
                return;
            }
            
            // Send to backend API
            console.log('📝 Deleting employee via API...');
            const response = await this.retryRequest(async () => {
                return await fetch(`/api/users/${this.employeeToDelete.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    const errorData = await response.json();
                    throw new Error(`Rate limit exceeded. Please try again in ${errorData.retryAfter || 30} seconds.`);
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete employee');
            }
            
            console.log('✅ Employee deleted successfully');
            
            // Reload employees to get the updated list from the database
            await this.loadEmployees();
            
            this.hideModal(document.getElementById('deleteConfirmModal'));
            this.showToast('Employee deleted successfully', 'success');
            this.employeeToDelete = null;
            
        } catch (error) {
            console.error('❌ Failed to delete employee:', error);
            this.showToast(error.message, 'error');
        }
    }

    exportEmployees() {
        try {
            const csvContent = this.generateCSV();
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Export completed successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed', 'error');
        }
    }

    generateCSV() {
        const headers = ['Name', 'Email', 'Department', 'Role', 'Status', 'Performance', 'Phone', 'Hire Date'];
        const rows = this.filteredEmployees.map(employee => [
            `${employee.first_name} ${employee.last_name}`,
            employee.email,
            employee.department,
            employee.role,
            employee.status,
            `${employee.performance}%`,
            employee.phone || '',
            employee.hire_date
        ]);
        
        return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                toast.style.background = '#10b981';
                break;
            case 'error':
                toast.style.background = '#ef4444';
                break;
            default:
                toast.style.background = '#4e8cff';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Invite Code Management Functions
    async regenerateInvite(employeeId) {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                this.showToast('Please log in to manage invite codes', 'error');
                return;
            }

            console.log('🔄 Regenerating invite code for employee:', employeeId);
            
            const response = await this.retryRequest(async () => {
                return await fetch(`/api/users/${employeeId}/regenerate-invite`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to regenerate invite code');
            }

            const result = await response.json();
            console.log('✅ Invite code regenerated:', result.invite_code);
            
            // Reload employees to show the new invite code
            await this.loadEmployees();
            
            this.showToast(`Invite code regenerated: ${result.invite_code}`, 'success');
            
        } catch (error) {
            console.error('❌ Failed to regenerate invite code:', error);
            this.showToast(error.message, 'error');
        }
    }

    async sendInvite(employeeId) {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                this.showToast('Please log in to send invites', 'error');
                return;
            }

            console.log('📧 Sending invite to employee:', employeeId);
            
            const response = await this.retryRequest(async () => {
                return await fetch(`/api/users/${employeeId}/send-invite`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send invite');
            }

            const result = await response.json();
            console.log('✅ Invite sent successfully:', result);
            
            // Reload employees to update the invite status
            await this.loadEmployees();
            
            this.showToast(`Invite sent to ${result.employee_name} (${result.email})`, 'success');
            
            // Show invite details in a modal or alert
            this.showInviteDetails(result);
            
        } catch (error) {
            console.error('❌ Failed to send invite:', error);
            this.showToast(error.message, 'error');
        }
    }

    async generateInvite(employeeId) {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                this.showToast('Please log in to generate invite codes', 'error');
                return;
            }

            console.log('🔑 Generating invite code for employee:', employeeId);
            
            // For now, we'll regenerate the invite code (which will generate a new one if none exists)
            await this.regenerateInvite(employeeId);
            
        } catch (error) {
            console.error('❌ Failed to generate invite code:', error);
            this.showToast(error.message, 'error');
        }
    }

    generateInviteCodeForModal() {
        // Generate a random 8-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Update the invite code input
        const inviteCodeInput = document.getElementById('inviteCode');
        if (inviteCodeInput) {
            inviteCodeInput.value = result;
            inviteCodeInput.style.background = '#dcfce7 !important';
            inviteCodeInput.style.borderColor = '#10b981 !important';
            
            // Reset styling after 2 seconds
            setTimeout(() => {
                inviteCodeInput.style.background = '#f3f4f6 !important';
                inviteCodeInput.style.borderColor = '#e5e7eb !important';
            }, 2000);
        }
        
        // Show success message
        this.showToast('Invite code generated successfully!', 'success');
    }

    showInviteDetails(inviteData) {
        // Create a modal to show invite details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="
                background: white;
                padding: 32px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="margin: 0; color: #374151;">📧 Invite Sent Successfully</h3>
                    <button onclick="this.closest('.modal').remove()" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #6b7280;
                    ">×</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <p style="margin: 0 0 16px 0; color: #6b7280;">
                        Invite details for <strong>${inviteData.employee_name}</strong>:
                    </p>
                    
                    <div style="
                        background: #f3f4f6;
                        padding: 16px;
                        border-radius: 8px;
                        margin-bottom: 16px;
                    ">
                        <div style="margin-bottom: 8px;">
                            <strong>Email:</strong> ${inviteData.email}
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Invite Code:</strong> 
                            <code style="
                                background: #e5e7eb;
                                padding: 4px 8px;
                                border-radius: 4px;
                                font-family: monospace;
                                font-weight: bold;
                                color: #374151;
                            ">${inviteData.invite_code}</code>
                        </div>
                        <div>
                            <strong>Expires:</strong> ${new Date(inviteData.expires_at).toLocaleDateString()}
                        </div>
                    </div>
                    
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                        💡 <strong>Next Steps:</strong> Send this invite code to the employee via email. 
                        They can use this code to register and join your organization.
                    </p>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button onclick="this.closest('.modal').remove()" style="
                        background: #6b7280;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Initialize users page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.usersPage = new UsersPage();
});

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 