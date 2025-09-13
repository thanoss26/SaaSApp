// Users Page JavaScript
class UserManagement {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.totalUsers = 0;
        this.filters = {
            search: '',
            role: '',
            status: '',
            organization: ''
        };
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
        this.selectedUsers = new Set();
        this.isLoading = false;
        this.currentView = 'table';
        
        this.initializeEventListeners();
    }

    async checkOrganizationRequirement() {
        try {
            console.log('🔍 Users - Checking organization requirement...');
            
            // Fetch user profile with timeout
            const profile = await Promise.race([
                fetch('/api/auth/profile', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }).then(res => res.json()),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
                )
            ]);

            console.log('🔍 Users - Profile loaded:', profile);
            
            // Extract actual profile data if nested
            const profileData = profile.profile || profile;
            
            // Check if user has super_admin role - they can access all user management features
            if (profileData.role === 'super_admin') {
                console.log('👑 Super admin detected - loading user management');
                this.currentUser = profileData;
                this.hideOrganizationRequired();
                await this.initializeUserManagement();
                return;
            }

            // For other roles, check organization requirement
            if (!profileData.organization_id) {
                console.log('❌ Organization required for role:', profileData.role);
                this.showOrganizationRequired();
                return;
            }

            console.log('✅ Organization found - loading user management');
            this.currentUser = profileData;
            this.hideOrganizationRequired();
            await this.initializeUserManagement();

        } catch (error) {
            console.error('❌ Error checking organization requirement:', error);
            this.showOrganizationRequired();
        }
    }

    showOrganizationRequired() {
        const orgRequiredSection = document.getElementById('organizationRequired');
        const userManagementContent = document.getElementById('userManagementContent');
        
        if (orgRequiredSection) {
            orgRequiredSection.style.display = 'flex';
        }
        if (userManagementContent) {
            userManagementContent.style.display = 'none';
        }
    }

    hideOrganizationRequired() {
        const orgRequiredSection = document.getElementById('organizationRequired');
        const userManagementContent = document.getElementById('userManagementContent');
        
        if (orgRequiredSection) {
            orgRequiredSection.style.display = 'none';
        }
        if (userManagementContent) {
            userManagementContent.style.display = 'block';
        }
    }

    async initializeUserManagement() {
        console.log('🚀 Initializing user management...');
        
        // Load initial data
        await Promise.all([
            this.loadUsers(),
            this.loadStats(),
            this.loadOrganizations()
        ]);
        
        // Set up periodic refresh for stats
        setInterval(() => this.loadStats(), 30000); // Refresh every 30 seconds
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounceSearch();
            });
        }

        // Filter controls
        const roleFilter = document.getElementById('roleFilter');
        const statusFilter = document.getElementById('statusFilter');
        const organizationFilter = document.getElementById('organizationFilter');

        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filters.role = e.target.value;
                this.loadUsers();
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.loadUsers();
            });
        }

        if (organizationFilter) {
            organizationFilter.addEventListener('change', (e) => {
                this.filters.organization = e.target.value;
                this.loadUsers();
            });
        }

        // View toggle
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Bulk actions
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.openBulkActionsModal());
        }

        // Add user button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.openAddUserModal());
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUsers());
        }

        // Select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.selectAllUsers(e.target.checked);
            });
        }

        // Modal close handlers
        this.setupModalHandlers();

        // Pagination
        this.setupPaginationHandlers();

        // Start organization requirement check
        this.checkOrganizationRequirement();
    }

    setupModalHandlers() {
        // Add User Modal
        const addUserModal = document.getElementById('addUserModal');
        const closeAddModal = document.getElementById('closeAddModal');
        const cancelAddUser = document.getElementById('cancelAddUser');
        const addUserForm = document.getElementById('addUserForm');

        if (closeAddModal) {
            closeAddModal.addEventListener('click', () => this.closeModal('addUserModal'));
        }

        if (cancelAddUser) {
            cancelAddUser.addEventListener('click', () => this.closeModal('addUserModal'));
        }

        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => this.handleAddUser(e));
        }

        // Close modal when clicking outside
        if (addUserModal) {
            addUserModal.addEventListener('click', (e) => {
                if (e.target === addUserModal) {
                    this.closeModal('addUserModal');
                }
            });
        }

        // Bulk Actions Modal
        const bulkActionsModal = document.getElementById('bulkActionsModal');
        const closeBulkModal = document.getElementById('closeBulkModal');

        if (closeBulkModal) {
            closeBulkModal.addEventListener('click', () => this.closeModal('bulkActionsModal'));
        }

        if (bulkActionsModal) {
            bulkActionsModal.addEventListener('click', (e) => {
                if (e.target === bulkActionsModal) {
                    this.closeModal('bulkActionsModal');
                }
            });

            // Bulk action buttons
            const bulkActionBtns = bulkActionsModal.querySelectorAll('.bulk-action-btn');
            bulkActionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    this.executeBulkAction(action);
                });
            });
        }
    }

    setupPaginationHandlers() {
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadUsers();
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadUsers();
                }
            });
        }
    }

    debounceSearch() {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentPage = 1;
            this.loadUsers();
        }, 300);
    }

    async loadStats() {
        try {
            console.log('📊 Loading user management stats...');
            
            // For super admin, show platform-wide stats
            if (this.currentUser?.role === 'super_admin') {
                const stats = {
                    totalUsers: 247,
                    activeUsers: 203,
                    adminUsers: 12,
                    recentLogins: 89
                };

                this.updateStatsDisplay(stats);
            } else {
                // For organization users, show organization-specific stats
                const response = await fetch('/api/users/stats', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const stats = await response.json();
                    this.updateStatsDisplay(stats);
                }
            }
        } catch (error) {
            console.error('❌ Error loading stats:', error);
            // Show default stats on error
            this.updateStatsDisplay({
                totalUsers: 0,
                activeUsers: 0,
                adminUsers: 0,
                recentLogins: 0
            });
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            totalUsers: document.getElementById('totalUsers'),
            activeUsers: document.getElementById('activeUsers'),
            adminUsers: document.getElementById('adminUsers'),
            recentLogins: document.getElementById('recentLogins')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key] && stats[key] !== undefined) {
                elements[key].textContent = stats[key].toLocaleString();
            }
        });
    }

    async loadUsers() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            console.log('👥 Loading users...');
            
            // For super admin, load all platform users
            if (this.currentUser?.role === 'super_admin') {
                await this.loadAllPlatformUsers();
            } else {
                // For organization users, load organization users
                await this.loadOrganizationUsers();
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    async loadAllPlatformUsers() {
        // For demo purposes, showing mock data for super admin
        const mockUsers = [
            {
                id: '1',
                first_name: 'John',
                last_name: 'Smith',
                email: 'john.smith@techcorp.com',
                role: 'admin',
                status: 'active',
                organization_name: 'TechCorp Inc',
                last_login: '2024-01-18T09:30:00Z',
                created_at: '2024-01-15T10:00:00Z'
            },
            {
                id: '2',
                first_name: 'Sarah',
                last_name: 'Johnson',
                email: 'sarah.j@innovate.co',
                role: 'manager',
                status: 'active',
                organization_name: 'Innovate Solutions',
                last_login: '2024-01-18T08:15:00Z',
                created_at: '2024-01-14T14:30:00Z'
            },
            {
                id: '3',
                first_name: 'Mike',
                last_name: 'Davis',
                email: 'mike.davis@startup.io',
                role: 'employee',
                status: 'pending',
                organization_name: 'StartupIO',
                last_login: null,
                created_at: '2024-01-18T16:20:00Z'
            }
        ];

        this.users = mockUsers;
        this.totalUsers = mockUsers.length;
        this.totalPages = Math.ceil(this.totalUsers / this.itemsPerPage);
        
        this.renderUsers();
        this.updatePagination();
        this.updateUserCount();
    }

    async loadOrganizationUsers() {
        const queryParams = new URLSearchParams({
            page: this.currentPage,
            limit: this.itemsPerPage,
            search: this.filters.search,
            role: this.filters.role,
            status: this.filters.status,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder
        });

        const response = await fetch(`/api/users?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const data = await response.json();
        this.users = data.users || [];
        this.totalUsers = data.total || 0;
        this.totalPages = data.totalPages || 1;
        
        this.renderUsers();
        this.updatePagination();
        this.updateUserCount();
    }

    async loadOrganizations() {
        try {
            // Only load organizations for organization filter if user is super admin
            if (this.currentUser?.role === 'super_admin') {
                const organizationFilter = document.getElementById('organizationFilter');
                if (organizationFilter) {
                    // Add mock organizations for demo
                    const organizations = [
                        { id: '1', name: 'TechCorp Inc' },
                        { id: '2', name: 'Innovate Solutions' },
                        { id: '3', name: 'StartupIO' }
                    ];

                    organizationFilter.innerHTML = '<option value="">All Organizations</option>';
                    organizations.forEach(org => {
                        const option = document.createElement('option');
                        option.value = org.id;
                        option.textContent = org.name;
                        organizationFilter.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error loading organizations:', error);
        }
    }

    renderUsers() {
        if (this.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderGridView();
        }
    }

    renderTableView() {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;

        if (this.users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <div>No users found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <input type="checkbox" 
                           class="user-checkbox" 
                           data-user-id="${user.id}"
                           ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                </td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.getInitials(user.first_name, user.last_name)}
                        </div>
                        <div class="user-details">
                            <div class="user-name">${user.first_name} ${user.last_name}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.organization_name || 'No Organization'}</td>
                <td><span class="role-badge ${user.role}">${this.formatRole(user.role)}</span></td>
                <td><span class="status-badge ${user.status}">${this.formatStatus(user.status)}</span></td>
                <td>${user.last_login ? this.formatDate(user.last_login) : 'Never'}</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="actions-cell">
                        <button class="action-btn edit" onclick="userManagement.editUser('${user.id}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="userManagement.deleteUser('${user.id}')" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners for checkboxes
        this.setupUserCheckboxes();
    }

    renderGridView() {
        const gridContainer = document.getElementById('usersGrid');
        if (!gridContainer) return;

        if (this.users.length === 0) {
            gridContainer.innerHTML = '<div>No users found</div>';
            return;
        }

        gridContainer.innerHTML = this.users.map(user => `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-avatar">
                        ${this.getInitials(user.first_name, user.last_name)}
                    </div>
                    <div class="user-details">
                        <h4>${user.first_name} ${user.last_name}</h4>
                        <p>${user.email}</p>
                    </div>
                </div>
                <div class="user-card-details">
                    <div class="user-card-detail">
                        <label>Organization</label>
                        <span>${user.organization_name || 'No Organization'}</span>
                    </div>
                    <div class="user-card-detail">
                        <label>Role</label>
                        <span class="role-badge ${user.role}">${this.formatRole(user.role)}</span>
                    </div>
                    <div class="user-card-detail">
                        <label>Status</label>
                        <span class="status-badge ${user.status}">${this.formatStatus(user.status)}</span>
                    </div>
                    <div class="user-card-detail">
                        <label>Last Login</label>
                        <span>${user.last_login ? this.formatDate(user.last_login) : 'Never'}</span>
                    </div>
                </div>
                <div class="user-card-actions">
                    <button class="action-btn edit" onclick="userManagement.editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="action-btn delete" onclick="userManagement.deleteUser('${user.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupUserCheckboxes() {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const userId = e.target.dataset.userId;
                if (e.target.checked) {
                    this.selectedUsers.add(userId);
                } else {
                    this.selectedUsers.delete(userId);
                }
                this.updateSelectAllState();
                this.updateBulkActionsState();
            });
        });
    }

    updateSelectAllState() {
        const selectAllCheckbox = document.getElementById('selectAll');
        if (!selectAllCheckbox) return;

        const totalVisible = this.users.length;
        const selectedVisible = this.users.filter(user => this.selectedUsers.has(user.id)).length;

        if (selectedVisible === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedVisible === totalVisible) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    updateBulkActionsState() {
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        if (bulkActionsBtn) {
            bulkActionsBtn.disabled = this.selectedUsers.size === 0;
        }
    }

    selectAllUsers(checked) {
        if (checked) {
            this.users.forEach(user => this.selectedUsers.add(user.id));
        } else {
            this.users.forEach(user => this.selectedUsers.delete(user.id));
        }
        
        const checkboxes = document.querySelectorAll('.user-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });

        this.updateBulkActionsState();
    }

    switchView(view) {
        this.currentView = view;

        // Update view buttons
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide view containers
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');

        if (tableView && gridView) {
            if (view === 'table') {
                tableView.classList.remove('hidden');
                gridView.classList.add('hidden');
            } else {
                tableView.classList.add('hidden');
                gridView.classList.remove('hidden');
            }
        }

        this.renderUsers();
    }

    updatePagination() {
        const paginationInfo = document.getElementById('paginationInfo');
        const pageNumbers = document.getElementById('pageNumbers');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');

        if (paginationInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.totalUsers);
            paginationInfo.textContent = `Showing ${start}-${end} of ${this.totalUsers} users`;
        }

        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }

        if (pageNumbers) {
            const pages = this.generatePageNumbers();
            pageNumbers.innerHTML = pages.map(page => {
                if (page === '...') {
                    return '<span class="page-ellipsis">...</span>';
                }
                return `
                    <button class="page-number ${page === this.currentPage ? 'active' : ''}"
                            onclick="userManagement.goToPage(${page})">
                        ${page}
                    </button>
                `;
            }).join('');
        }
    }

    generatePageNumbers() {
        const pages = [];
        const maxVisible = 5;
        
        if (this.totalPages <= maxVisible) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            
            if (this.currentPage > 3) {
                pages.push('...');
            }
            
            const start = Math.max(2, this.currentPage - 1);
            const end = Math.min(this.totalPages - 1, this.currentPage + 1);
            
            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }
            
            if (this.currentPage < this.totalPages - 2) {
                pages.push('...');
            }
            
            if (!pages.includes(this.totalPages)) {
                pages.push(this.totalPages);
            }
        }
        
        return pages;
    }

    goToPage(page) {
        if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadUsers();
        }
    }

    updateUserCount() {
        const userCount = document.getElementById('userCount');
        if (userCount) {
            userCount.textContent = `${this.totalUsers} users`;
        }
    }

    showLoadingState() {
        const tableBody = document.getElementById('usersTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <div class="loading-spinner"></div>
                        <span>Loading users...</span>
                    </td>
                </tr>
            `;
        }
    }

    showErrorState() {
        const tableBody = document.getElementById('usersTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="loading-row">
                        <div>❌ Error loading users. Please try again.</div>
                    </td>
                </tr>
            `;
        }
    }

    // Utility methods
    getInitials(firstName, lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    formatRole(role) {
        const roles = {
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'manager': 'Manager',
            'employee': 'Employee'
        };
        return roles[role] || role;
    }

    formatStatus(status) {
        const statuses = {
            'active': 'Active',
            'inactive': 'Inactive',
            'pending': 'Pending'
        };
        return statuses[status] || status;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Modal methods
    openAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.classList.add('show');
            // Reset form
            const form = document.getElementById('addUserForm');
            if (form) {
                form.reset();
            }
        }
    }

    openBulkActionsModal() {
        const modal = document.getElementById('bulkActionsModal');
        const selectedCount = document.getElementById('selectedCount');
        
        if (modal && this.selectedUsers.size > 0) {
            if (selectedCount) {
                selectedCount.textContent = this.selectedUsers.size;
            }
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // User actions
    async handleAddUser(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            role: formData.get('role'),
            organization: formData.get('organization'),
            status: formData.get('status')
        };

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                this.closeModal('addUserModal');
                await this.loadUsers();
                this.showNotification('User created successfully', 'success');
            } else {
                const error = await response.json();
                this.showNotification(error.message || 'Failed to create user', 'error');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            this.showNotification('Failed to create user', 'error');
        }
    }

    async editUser(userId) {
        console.log('Editing user:', userId);
        // TODO: Implement edit user modal
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                const response = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    await this.loadUsers();
                    this.showNotification('User deleted successfully', 'success');
                } else {
                    const error = await response.json();
                    this.showNotification(error.message || 'Failed to delete user', 'error');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('Failed to delete user', 'error');
            }
        }
    }

    async executeBulkAction(action) {
        const selectedUserIds = Array.from(this.selectedUsers);
        
        if (selectedUserIds.length === 0) {
            this.showNotification('No users selected', 'warning');
            return;
        }

        const confirmMessages = {
            'activate': `Activate ${selectedUserIds.length} user(s)?`,
            'deactivate': `Deactivate ${selectedUserIds.length} user(s)?`,
            'delete': `Delete ${selectedUserIds.length} user(s)? This action cannot be undone.`,
            'export': `Export ${selectedUserIds.length} user(s)?`
        };

        if (confirm(confirmMessages[action])) {
            try {
                let response;
                
                switch (action) {
                    case 'activate':
                    case 'deactivate':
                        response = await fetch('/api/users/bulk-status', {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({
                                userIds: selectedUserIds,
                                status: action === 'activate' ? 'active' : 'inactive'
                            })
                        });
                        break;
                        
                    case 'delete':
                        response = await fetch('/api/users/bulk-delete', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ userIds: selectedUserIds })
                        });
                        break;
                        
                    case 'export':
                        this.exportSelectedUsers(selectedUserIds);
                        this.closeModal('bulkActionsModal');
                        return;
                }

                if (response && response.ok) {
                    this.selectedUsers.clear();
                    await this.loadUsers();
                    this.closeModal('bulkActionsModal');
                    this.showNotification(`Users ${action}d successfully`, 'success');
                } else {
                    const error = await response.json();
                    this.showNotification(error.message || `Failed to ${action} users`, 'error');
                }
            } catch (error) {
                console.error(`Error ${action}ing users:`, error);
                this.showNotification(`Failed to ${action} users`, 'error');
            }
        }
    }

    async exportUsers() {
        // TODO: Implement user export functionality
        console.log('Exporting all users...');
        this.showNotification('Export functionality coming soon', 'info');
    }

    async exportSelectedUsers(userIds) {
        // TODO: Implement selected users export functionality
        console.log('Exporting selected users:', userIds);
        this.showNotification('Export functionality coming soon', 'info');
    }

    showNotification(message, type = 'info') {
        // TODO: Implement notification system
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialize user management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagement();
}); 