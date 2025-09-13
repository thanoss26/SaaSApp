// Users Page JavaScript
class UserManagement {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.currentPage = 1;
        this.itemsPerPage = 25;
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
        
        // Initialize theme
        this.initializeTheme();
        
        // Load initial data
        await Promise.all([
            this.loadUsers(),
            this.loadStats()
        ]);
        
        // Load organizations for super admin (optional)
        if (this.currentUser?.role === 'super_admin') {
            this.loadOrganizations().catch(error => {
                console.warn('⚠️ Could not load organizations:', error);
            });
        }
        
        // Set up periodic refresh for stats
        setInterval(() => this.loadStats(), 30000); // Refresh every 30 seconds
    }

    initializeEventListeners() {
        // Search functionality - correct ID
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounceSearch();
            });
        }

        // Filter controls
        const roleFilter = document.getElementById('roleFilter');
        const statusFilter = document.getElementById('statusFilter');
        const orgFilter = document.getElementById('orgFilter');

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

        if (orgFilter) {
            orgFilter.addEventListener('change', (e) => {
                this.filters.organization = e.target.value;
                this.loadUsers();
            });
        }

        // View toggle - correct class and IDs
        const tableViewBtn = document.getElementById('tableViewBtn');
        const gridViewBtn = document.getElementById('gridViewBtn');
        
        if (tableViewBtn) {
            tableViewBtn.addEventListener('click', () => this.switchView('table'));
        }
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => this.switchView('grid'));
        }

        // Bulk actions
        const bulkActionsBtn = document.getElementById('bulkActionsBtn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.openBulkActionsModal());
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportUsers());
        }

        // Theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
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
                this.goToPage(this.currentPage - 1);
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.goToPage(this.currentPage + 1);
            });
        }
    }

    async loadOrganizations() {
        try {
            console.log('🏢 Loading organizations for super admin...');
            
            const response = await fetch('/api/organizations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const organizations = await response.json();
                console.log('✅ Organizations loaded:', organizations);
                
                // Populate organization filter dropdown if it exists
                const orgFilter = document.getElementById('orgFilter');
                if (orgFilter && organizations.length > 0) {
                    // Clear existing options except first one
                    while (orgFilter.children.length > 1) {
                        orgFilter.removeChild(orgFilter.lastChild);
                    }
                    
                    // Add organization options
                    organizations.forEach(org => {
                        const option = document.createElement('option');
                        option.value = org.id;
                        option.textContent = org.name;
                        orgFilter.appendChild(option);
                    });
                }
            } else {
                console.warn('⚠️ Could not load organizations:', response.statusText);
            }
        } catch (error) {
            console.warn('⚠️ Error loading organizations:', error);
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
            
            // Fetch real-time statistics from API
            const response = await fetch('/api/users/statistics', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const stats = await response.json();
                console.log('✅ Stats loaded:', stats);
                this.updateStatsDisplay(stats);
            } else {
                console.error('❌ Failed to load stats:', response.statusText);
                this.showDefaultStats();
            }
        } catch (error) {
            console.error('❌ Error loading stats:', error);
            this.showDefaultStats();
        }
    }

    showDefaultStats() {
        // Show default stats on error
        this.updateStatsDisplay({
            totalUsers: { value: 0, growth: 0, trend: 'neutral', detail: 'No data available' },
            activeUsers: { value: 0, growth: 0, trend: 'neutral', detail: 'No data available' },
            adminUsers: { value: 0, growth: 0, trend: 'neutral', detail: 'No data available' },
            recentLogins: { value: 0, growth: 0, trend: 'neutral', detail: 'No data available' }
        });
    }

    updateStatsDisplay(stats) {
        const statCards = ['totalUsers', 'activeUsers', 'adminUsers', 'recentLogins'];
        
        statCards.forEach(statKey => {
            const statData = stats[statKey];
            if (!statData) return;

            // Update the value
            const valueElement = document.getElementById(statKey);
            if (valueElement) {
                const value = typeof statData === 'object' ? statData.value : statData;
                valueElement.textContent = value.toLocaleString();
            }

            // Update trend if available
            if (typeof statData === 'object') {
                const trendElement = valueElement?.closest('.stat-card-modern')?.querySelector('.stat-trend span');
                const detailElement = valueElement?.closest('.stat-card-modern')?.querySelector('.stat-detail');
                
                if (trendElement && statData.growth !== undefined) {
                    trendElement.textContent = `${statData.growth}%`;
                }
                
                if (detailElement && statData.detail) {
                    detailElement.textContent = statData.detail;
                }

                // Update trend class
                const trendContainer = valueElement?.closest('.stat-card-modern')?.querySelector('.stat-trend');
                if (trendContainer && statData.trend) {
                    trendContainer.className = `stat-trend ${statData.trend}`;
                    
                    // Update trend icon
                    const trendIcon = trendContainer.querySelector('i');
                    if (trendIcon) {
                        if (statData.trend === 'positive') {
                            trendIcon.className = 'fas fa-arrow-up';
                        } else if (statData.trend === 'negative') {
                            trendIcon.className = 'fas fa-arrow-down';
                        } else {
                            trendIcon.className = 'fas fa-minus';
                        }
                    }
                }
            }
        });

        console.log('✅ Stats display updated');
    }

    async loadUsers() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            console.log('👥 Loading users...', {
                page: this.currentPage,
                limit: this.itemsPerPage,
                filters: this.filters,
                token: localStorage.getItem('token') ? 'Present' : 'Missing'
            });
            
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.filters.search,
                role: this.filters.role,
                status: this.filters.status,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            });

            console.log('📡 API request URL:', `/api/users/paginated?${params}`);

            // Fetch users from API
            const response = await fetch(`/api/users/paginated?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            console.log('📡 API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Users loaded:', data);
                
                this.users = data.users || [];
                this.totalUsers = data.pagination?.total || 0;
                this.totalPages = data.pagination?.totalPages || 1;
                
                console.log('📊 User data:', {
                    userCount: this.users.length,
                    totalUsers: this.totalUsers,
                    totalPages: this.totalPages,
                    currentPage: this.currentPage
                });
                
                this.updateUsersDisplay();
                this.updatePagination();
                this.updateResultsCount();
            } else {
                const errorData = await response.text();
                console.error('❌ Failed to load users:', response.statusText, errorData);
                this.showErrorState();
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    updateUsersDisplay() {
        if (this.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderGridView();
        }
        
        // Show table or grid view
        this.showDataView();
    }

    showDataView() {
        const loadingState = document.getElementById('loadingState');
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');
        const emptyState = document.getElementById('emptyState');

        if (loadingState) loadingState.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        
        if (this.users.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (tableView) tableView.style.display = 'none';
            if (gridView) gridView.style.display = 'none';
        } else {
            if (this.currentView === 'table') {
                if (tableView) tableView.style.display = 'block';
                if (gridView) gridView.style.display = 'none';
            } else {
                if (tableView) tableView.style.display = 'none';
                if (gridView) gridView.style.display = 'block';
            }
        }
    }

    updateResultsCount() {
        const resultsCountElement = document.getElementById('resultsCount');
        if (resultsCountElement) {
            resultsCountElement.textContent = `Showing ${this.users.length} of ${this.totalUsers} users`;
        }
    }

    async loadOrganizations() {
        try {
            // Load organizations for filter if user is super admin
            if (this.currentUser?.role === 'super_admin') {
                const orgFilter = document.getElementById('orgFilter');
                if (orgFilter) {
                    try {
                        const response = await fetch('/api/organizations', {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        });

                        if (response.ok) {
                            const organizations = await response.json();
                            orgFilter.innerHTML = '<option value="">All Organizations</option>';
                            organizations.forEach(org => {
                                const option = document.createElement('option');
                                option.value = org.id;
                                option.textContent = org.name;
                                orgFilter.appendChild(option);
                            });
                        }
                    } catch (orgError) {
                        console.log('📝 Organizations not available, using fallback');
                        // Fallback if no organizations endpoint
                        orgFilter.innerHTML = '<option value="">All Organizations</option>';
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading organizations:', error);
        }
    }

    showLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');
        const emptyState = document.getElementById('emptyState');

        if (loadingState) loadingState.style.display = 'flex';
        if (tableView) tableView.style.display = 'none';
        if (gridView) gridView.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }

    showErrorState() {
        const loadingState = document.getElementById('loadingState');
        const tableView = document.getElementById('tableView');
        const gridView = document.getElementById('gridView');
        const emptyState = document.getElementById('emptyState');

        if (loadingState) loadingState.style.display = 'none';
        if (tableView) tableView.style.display = 'none';
        if (gridView) gridView.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
            const emptyIcon = emptyState.querySelector('.empty-icon-modern i');
            const emptyTitle = emptyState.querySelector('h3');
            const emptyText = emptyState.querySelector('p');
            
            if (emptyIcon) emptyIcon.className = 'fas fa-exclamation-triangle';
            if (emptyTitle) emptyTitle.textContent = 'Error loading users';
            if (emptyText) emptyText.textContent = 'Please try refreshing the page or contact support if the problem persists.';
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
                    <td colspan="7" class="loading-row">
                        <div>No users found</div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = this.users.map(user => `
            <tr>
                <td>
                    <label class="checkbox-modern">
                        <input type="checkbox" 
                               class="user-checkbox" 
                               data-user-id="${user.id}"
                               ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                </td>
                <td>
                    <div class="user-info-modern">
                        <div class="user-avatar-modern">
                            ${this.getInitials(user.first_name, user.last_name)}
                        </div>
                        <div class="user-details-modern">
                            <div class="user-name-modern">${user.first_name} ${user.last_name}</div>
                            <div class="user-email-modern">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="role-badge-modern ${user.role}">${this.formatRole(user.role)}</span></td>
                <td><span class="status-badge-modern ${user.status}">${this.formatStatus(user.status)}</span></td>
                <td>${user.last_login ? this.formatDate(user.last_login) : 'No recent activity'}</td>
                <td>
                    <div class="actions-cell-modern">
                        <button class="btn-modern btn-sm btn-outline-modern" onclick="userManagement.editUser('${user.id}')" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-modern btn-sm btn-outline-modern" onclick="userManagement.deleteUser('${user.id}')" title="Delete User">
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
            <div class="user-card-modern">
                <div class="user-card-header">
                    <div class="user-avatar-modern">
                        ${this.getInitials(user.first_name, user.last_name)}
                    </div>
                    <div class="user-info-modern">
                        <div class="user-name-modern">${user.first_name} ${user.last_name}</div>
                        <div class="user-email-modern">${user.email}</div>
                    </div>
                </div>
                <div class="user-card-body">
                    <div class="user-detail-row">
                        <span class="user-detail-label">Role</span>
                        <span class="role-badge-modern ${user.role}">${this.formatRole(user.role)}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label">Status</span>
                        <span class="status-badge-modern ${user.status}">${this.formatStatus(user.status)}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label">Last Active</span>
                        <span class="user-detail-value">${user.last_login ? this.formatDate(user.last_login) : 'No recent activity'}</span>
                    </div>
                    <div class="user-detail-row">
                        <span class="user-detail-label">Organization</span>
                        <span class="user-detail-value">${user.organization || 'No Organization'}</span>
                    </div>
                </div>
                <div class="user-card-actions">
                    <button class="btn-modern btn-sm btn-outline-modern" onclick="userManagement.editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn-modern btn-sm btn-outline-modern" onclick="userManagement.deleteUser('${user.id}')">
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

    renderUsers() {
        if (this.currentView === 'table') {
            this.renderTableView();
        } else {
            this.renderGridView();
        }
    }

    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadUsers();
        }
    }

    updatePagination() {
        // Update the simple pagination in the quick actions bar
        const pageInfo = document.getElementById('pageInfo');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');

        if (pageInfo) {
            pageInfo.textContent = `${this.currentPage} of ${this.totalPages}`;
        }

        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= this.totalPages;
        }

        // Update the detailed pagination info at the bottom
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.totalUsers);
            paginationInfo.textContent = `Showing ${start} to ${end} of ${this.totalUsers} entries`;
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
        if (!dateString) return 'Never';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    // Modal methods

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
        try {
            console.log('📤 Exporting users...');
            
            // Show loading state
            const exportBtn = document.getElementById('exportBtn');
            const originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportBtn.disabled = true;
            
            // Fetch all users (not paginated)
            const params = new URLSearchParams({
                page: 1,
                limit: 1000, // Get a large number to export all
                search: this.filters.search,
                role: this.filters.role,
                status: this.filters.status,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            });

            const response = await fetch(`/api/users/paginated?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users for export');
            }

            const data = await response.json();
            const users = data.users || [];
            
            if (users.length === 0) {
                this.showNotification('No users to export', 'warning');
                return;
            }

            // Create CSV content
            const csvContent = this.generateCSV(users);
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ Exported ${users.length} users to CSV`);
            this.showNotification(`Successfully exported ${users.length} users`, 'success');
            
        } catch (error) {
            console.error('❌ Error exporting users:', error);
            this.showNotification('Failed to export users', 'error');
        } finally {
            // Restore button state
            const exportBtn = document.getElementById('exportBtn');
            exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
            exportBtn.disabled = false;
        }
    }

    generateCSV(users) {
        // Define CSV headers
        const headers = [
            'ID',
            'First Name',
            'Last Name', 
            'Email',
            'Role',
            'Status',
            'Last Activity',
            'Created Date',
            'Organization',
            'Type'
        ];
        
        // Convert users to CSV rows
        const rows = users.map(user => [
            user.id,
            user.first_name || '',
            user.last_name || '',
            user.email || '',
            this.formatRole(user.role),
            this.formatStatus(user.status),
            user.last_login ? this.formatDate(user.last_login) : 'No recent activity',
            user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
            user.organization || 'No Organization',
            user.type || 'user'
        ]);
        
        // Combine headers and rows
        const allRows = [headers, ...rows];
        
        // Convert to CSV string
        return allRows.map(row => 
            row.map(field => {
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const stringField = String(field || '');
                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                    return '"' + stringField.replace(/"/g, '""') + '"';
                }
                return stringField;
            }).join(',')
        ).join('\n');
    }

    async exportSelectedUsers(userIds) {
        // TODO: Implement selected users export functionality
        console.log('Exporting selected users:', userIds);
        this.showNotification('Export functionality coming soon', 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            max-width: 500px;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            animation: slideIn 0.3s ease-out;
            font-family: inherit;
            font-size: 14px;
            ${this.getNotificationStyles(type)}
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getNotificationStyles(type) {
        const styles = {
            'success': 'background: #10b981; color: white;',
            'error': 'background: #ef4444; color: white;',
            'warning': 'background: #f59e0b; color: white;',
            'info': 'background: #3b82f6; color: white;'
        };
        return styles[type] || styles.info;
    }

    // Theme management methods
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        this.applyTheme(newTheme);
        this.updateThemeIcon(newTheme);
        localStorage.setItem('theme', newTheme);
        
        console.log(`🎨 Theme switched to: ${newTheme}`);
    }

    applyTheme(theme) {
        const html = document.documentElement;
        const body = document.body;
        
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
            body.classList.add('dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
            body.classList.remove('dark');
        }
    }

    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.className = 'fas fa-sun';
                    themeToggle.title = 'Switch to Light Mode';
                } else {
                    icon.className = 'fas fa-moon';
                    themeToggle.title = 'Switch to Dark Mode';
                }
            }
        }
    }
}

// Initialize user management when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userManagement = new UserManagement();
}); 