// Global state
let currentUser = null;
let currentToken = null;

// API base URL
const API_BASE = '/api';

// Utility functions
const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
};

const showModal = (title, content) => {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.remove('hidden');
};

const hideModal = () => {
    document.getElementById('modalOverlay').classList.add('hidden');
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// API functions
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(currentToken && { 'Authorization': `Bearer ${currentToken}` })
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// Auth functions
const login = async (email, password) => {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    currentUser = data.user;
    currentToken = data.access_token;
    
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    
    return data;
};

const register = async (userData) => {
    const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    
    return data;
};

const joinOrganization = async (joinCode) => {
    const data = await apiRequest('/auth/join-organization', {
        method: 'POST',
        body: JSON.stringify({ join_code: joinCode })
    });
    
    return data;
};

const logout = async () => {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    showAuthView();
};

// Data fetching functions
const fetchDashboardData = async () => {
    try {
        const [orgStats, userStats] = await Promise.all([
            apiRequest('/organizations/stats'),
            apiRequest('/users/stats/overview')
        ]);
        
        // Update dashboard stats
        document.getElementById('totalEmployees').textContent = userStats.stats.totalUsers || 0;
        document.getElementById('activeEmployees').textContent = userStats.stats.activeUsers || 0;
        document.getElementById('adminCount').textContent = userStats.stats.adminUsers || 0;
        document.getElementById('recentSignups').textContent = userStats.stats.recentSignups || 0;
        
        // Update recent activity
        updateRecentActivity();
        
    } catch (error) {
        showToast('Failed to load dashboard data', 'error');
    }
};

const fetchEmployees = async () => {
    try {
        const data = await apiRequest('/users');
        renderEmployeesTable(data.users);
    } catch (error) {
        showToast('Failed to load employees', 'error');
    }
};

const fetchOrganizationData = async () => {
    try {
        const [orgData, orgStats] = await Promise.all([
            apiRequest('/organizations'),
            apiRequest('/organizations/stats')
        ]);
        
        // Update organization info
        document.getElementById('orgName').textContent = orgData.organization.name;
        document.getElementById('orgJoinCode').textContent = orgData.organization.join_code;
        document.getElementById('orgCreated').textContent = formatDate(orgData.organization.created_at);
        
        // Update organization stats
        document.getElementById('orgTotalMembers').textContent = orgStats.stats.totalMembers || 0;
        document.getElementById('orgActiveMembers').textContent = orgStats.stats.activeMembers || 0;
        document.getElementById('orgAdminCount').textContent = orgStats.stats.adminCount || 0;
        
    } catch (error) {
        showToast('Failed to load organization data', 'error');
    }
};

const fetchProfile = async () => {
    try {
        const data = await apiRequest('/auth/profile');
        renderProfile(data.profile);
    } catch (error) {
        showToast('Failed to load profile', 'error');
    }
};

// Rendering functions
const renderEmployeesTable = (employees) => {
    const tbody = document.getElementById('employeesTableBody');
    
    if (!employees || employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No employees found</td></tr>';
        return;
    }
    
    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>
                <div>
                    <strong>${employee.first_name} ${employee.last_name}</strong>
                </div>
            </td>
            <td>${employee.email}</td>
            <td>
                <span class="role-badge role-${employee.role === 'admin' ? 'admin' : 'member'}">
                    ${employee.role === 'admin' ? 'Admin' : 'Member'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${employee.is_active ? 'active' : 'inactive'}">
                    ${employee.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${formatDate(employee.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline" onclick="viewEmployee('${employee.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${currentUser.role === 'admin' ? `
                        <button class="btn btn-sm btn-outline" onclick="editEmployee('${employee.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
};

const renderProfile = (profile) => {
    document.getElementById('profileName').textContent = `${profile.first_name} ${profile.last_name}`;
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('profileRole').textContent = profile.role === 'admin' ? 'Administrator' : 'Organization Member';
    
    document.getElementById('profileFirstName').value = profile.first_name;
    document.getElementById('profileLastName').value = profile.last_name;
};

const updateRecentActivity = () => {
    const activityList = document.getElementById('recentActivity');
    activityList.innerHTML = `
        <div class="activity-item">
            <i class="fas fa-info-circle"></i>
                            <span>Welcome to Chronos HR! Your dashboard is ready.</span>
        </div>
    `;
};

const updateUserInfo = () => {
    if (currentUser) {
        document.getElementById('userName').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Member';
    }
};

// View management
const showView = (viewName) => {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${viewName}View`).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Load view-specific data
    switch (viewName) {
        case 'dashboard':
            fetchDashboardData();
            break;
        case 'employees':
            fetchEmployees();
            break;
        case 'organization':
            fetchOrganizationData();
            break;
        case 'profile':
            fetchProfile();
            break;
    }
};

const showAuthView = () => {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    
    // Show login form by default
    showLoginForm();
};

const showAppView = () => {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    
    updateUserInfo();
    showView('dashboard');
};

const showLoginForm = () => {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('joinOrgForm').classList.add('hidden');
};

const showRegisterForm = () => {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('joinOrgForm').classList.add('hidden');
};

const showJoinOrgForm = () => {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('joinOrgForm').classList.remove('hidden');
};

// Event handlers
const handleLogin = async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await login(email, password);
        showToast('Login successful!', 'success');
        // Redirect to dashboard.html instead of showing app view
        window.location.href = '/dashboard.html';
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const handleRegister = async (e) => {
    e.preventDefault();
    
    const userData = {
        first_name: document.getElementById('registerFirstName').value,
        last_name: document.getElementById('registerLastName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
    };
    
    try {
        const data = await register(userData);
        
        if (data.requiresJoinCode) {
            showToast('Account created! Please join an organization.', 'success');
            showJoinOrgForm();
        } else {
            showToast('Account created successfully!', 'success');
            await login(userData.email, userData.password);
            // Redirect to dashboard.html instead of showing app view
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const handleJoinOrganization = async (e) => {
    e.preventDefault();
    
    const joinCode = document.getElementById('joinCode').value;
    
    try {
        await joinOrganization(joinCode);
        showToast('Successfully joined organization!', 'success');
        // Redirect to dashboard.html instead of showing app view
        window.location.href = '/dashboard.html';
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    const updateData = {
        first_name: document.getElementById('profileFirstName').value,
        last_name: document.getElementById('profileLastName').value
    };
    
    try {
        await apiRequest('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        showToast('Profile updated successfully!', 'success');
        fetchProfile();
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const handleRegenerateCode = async () => {
    try {
        const data = await apiRequest('/organizations/regenerate-join-code', {
            method: 'POST'
        });
        
        document.getElementById('orgJoinCode').textContent = data.organization.join_code;
        showToast('Join code regenerated successfully!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
};

const handleEmployeeSearch = (e) => {
    const query = e.target.value.trim();
    
    if (query.length >= 2) {
        apiRequest(`/users/search/${query}`)
            .then(data => renderEmployeesTable(data.users))
            .catch(error => showToast('Search failed', 'error'));
    } else if (query.length === 0) {
        fetchEmployees();
    }
};

// Employee management functions
const viewEmployee = (employeeId) => {
    apiRequest(`/users/${employeeId}`)
        .then(data => {
            const employee = data.user;
            const content = `
                <div class="employee-details">
                    <h4>${employee.first_name} ${employee.last_name}</h4>
                    <p><strong>Email:</strong> ${employee.email}</p>
                    <p><strong>Role:</strong> ${employee.role === 'admin' ? 'Administrator' : 'Organization Member'}</p>
                    <p><strong>Status:</strong> ${employee.is_active ? 'Active' : 'Inactive'}</p>
                    <p><strong>Joined:</strong> ${formatDateTime(employee.created_at)}</p>
                </div>
            `;
            showModal('Employee Details', content);
        })
        .catch(error => showToast(error.message, 'error'));
};

const editEmployee = (employeeId) => {
    // This would open an edit modal for admins
    showToast('Edit functionality coming soon!', 'info');
};

// Initialize application
const initApp = async () => {
    // Check for existing token
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            currentToken = token;
            const data = await apiRequest('/auth/profile');
            currentUser = data.profile;
            showAppView();
        } catch (error) {
            console.error('Token validation failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            showAuthView();
        }
    } else {
        showAuthView();
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auth form listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('joinOrgForm').addEventListener('submit', handleJoinOrganization);
    
    // Auth navigation
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
    
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
    
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const input = toggle.previousElementSibling;
            const icon = toggle.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            showView(view);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    
    // Organization management
    document.getElementById('regenerateCode').addEventListener('click', handleRegenerateCode);
    
    // Employee search
    document.getElementById('employeeSearch').addEventListener('input', handleEmployeeSearch);
    
    // Modal close
    document.getElementById('modalClose').addEventListener('click', hideModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) {
            hideModal();
        }
    });
    
    // Quick actions
    document.getElementById('inviteEmployee').addEventListener('click', () => {
        showToast('Invite functionality coming soon!', 'info');
    });
    
    document.getElementById('viewReports').addEventListener('click', () => {
        showToast('Reports functionality coming soon!', 'info');
    });
    
    document.getElementById('manageOrg').addEventListener('click', () => {
        showView('organization');
    });
    
    document.getElementById('addEmployee').addEventListener('click', () => {
        showToast('Add employee functionality coming soon!', 'info');
    });
    
    // Initialize the app
    initApp();
});

// Role-based UI updates
const updateUIForRole = () => {
    if (currentUser) {
        const isAdmin = currentUser.role === 'admin';
        
        // Show/hide admin-only elements
        document.getElementById('employeesNav').style.display = isAdmin ? 'flex' : 'none';
        document.getElementById('orgNav').style.display = isAdmin ? 'flex' : 'none';
        
        // Update quick actions visibility
        const quickActions = document.querySelectorAll('#inviteEmployee, #viewReports, #manageOrg');
        quickActions.forEach(action => {
            action.style.display = isAdmin ? 'block' : 'none';
        });
    }
};

// Call this after user login
document.addEventListener('userLoggedIn', updateUIForRole); 