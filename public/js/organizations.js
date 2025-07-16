// Modern Organization Dashboard JavaScript - Efficio

class OrganizationsManager {
    constructor() {
        this.organizations = [];
        this.currentUser = null;
        this.tasks = {
            new: 3,
            progress: 6,
            complete: 12
        };
        this.init();
    }

    async init() {
        // Check if we're in the main app context
        const isInMainApp = window.location.pathname === '/' || window.location.pathname === '/index.html';
        
        if (isInMainApp) {
            console.log('✅ Running in main app context');
            // Let the main app handle authentication
            return;
        }
        
        console.log('🔍 Running in standalone organizations page');
        
        // Check authentication before proceeding
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
            console.log('❌ Not authenticated, redirecting to main app');
            window.location.href = '/index.html';
            return;
        }
        
        await this.loadUserProfile();
        this.setGreetingAndDate();
        await this.loadOrganizations();
        this.setupEventListeners();
        this.updateStats();
        this.setupTaskManagement();
    }
    
    async checkAuthentication() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ No token found');
            return false;
        }
        
        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            return response.ok;
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            return false;
        }
    }

    async loadUserProfile() {
        try {
            // Check if user has a token
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('❌ No authentication token found');
                this.showAuthError();
                return;
            }

            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.profile;
                this.updateUserInfo();
                console.log('✅ User profile loaded from database:', this.currentUser);
            } else if (response.status === 401) {
                console.log('❌ Token expired or invalid');
                // Clear tokens and show auth error
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                this.showAuthError();
                return;
            } else {
                console.error('❌ Failed to load user profile:', response.status, response.statusText);
                this.showAuthError();
                return;
            }
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
            // Clear tokens and show auth error
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            this.showAuthError();
            return;
        }
    }
    
    showAuthError() {
        // Show a user-friendly authentication error with login form
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="auth-error-container">
                    <div class="auth-error-card">
                        <div class="auth-error-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h2>Authentication Required</h2>
                        <p>Please log in to access the organizations dashboard.</p>
                        
                        <form id="loginForm" class="auth-form">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required>
                            </div>
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input type="password" id="password" name="password" required>
                            </div>
                            <button type="submit" class="auth-error-btn">
                                <i class="fas fa-sign-in-alt"></i>
                                Login
                            </button>
                        </form>
                        
                        <div class="auth-links">
                            <a href="/index.html">Go to Main App</a>
                        </div>
                    </div>
                </div>
            `;
            
            // Add login form handler
            document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('refreshToken', data.refresh_token);
                
                // Reload the page to initialize with the new token
                window.location.reload();
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.showNotification('Login failed: ' + error.message, 'error');
        }
    }

    updateUserInfo() {
        if (this.currentUser) {
            // Update main greeting
            const userNameElement = document.getElementById('orgUserName');
            if (userNameElement) {
                userNameElement.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            }
            
            // Update sidebar user info
            const sidebarUserName = document.getElementById('sidebarUserName');
            const sidebarUserRole = document.getElementById('sidebarUserRole');
            const userAvatar = document.getElementById('userAvatar');
            
            if (sidebarUserName) {
                sidebarUserName.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            }
            
            if (sidebarUserRole) {
                sidebarUserRole.textContent = this.currentUser.role || 'User';
            }
            
            if (userAvatar) {
                // Generate avatar based on user's name
                const avatarUrl = this.generateAvatarUrl(this.currentUser.first_name, this.currentUser.last_name);
                userAvatar.src = avatarUrl;
            }
            
            console.log('✅ User info updated in UI:', {
                name: `${this.currentUser.first_name} ${this.currentUser.last_name}`,
                role: this.currentUser.role,
                email: this.currentUser.email
            });
        }
    }
    
    generateAvatarUrl(firstName, lastName) {
        // Use DiceBear API to generate consistent avatars based on name
        const seed = `${firstName}${lastName}`.toLowerCase();
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    }

    setGreetingAndDate() {
        const dateElem = document.getElementById('orgDate');
        if (dateElem) {
            const now = new Date();
            const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
            dateElem.textContent = now.toLocaleDateString(undefined, options);
        }
    }

    async loadOrganizations() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('❌ No token available for organizations request');
                return;
            }

            const response = await fetch('/api/organizations', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.organizations = data.organizations || [];
                console.log('✅ Organizations loaded from database:', this.organizations);
            } else if (response.status === 401) {
                console.log('❌ Token expired for organizations request');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/index.html';
                return;
            } else {
                console.error('❌ Failed to load organizations:', response.status);
                this.organizations = [];
            }
        } catch (error) {
            console.error('❌ Error loading organizations:', error);
            this.organizations = [];
        }
    }

    updateStats() {
        // Update metric cards with real or demo data
        const totalEmployees = this.organizations.reduce((sum, org) => sum + (org.member_count || 0), 0);
        const totalRevenue = this.organizations.reduce((sum, org) => sum + (org.revenue || 0), 0);
        const avgAttendanceRate = this.organizations.reduce((sum, org) => sum + (org.attendance_rate || 0), 0) / Math.max(this.organizations.length, 1);

        // Update Total Employees card
        const employeesValue = document.querySelector('.metric-card:nth-child(1) .metric-value');
        if (employeesValue) employeesValue.textContent = totalEmployees;

        // Update Job Applicants card (demo data)
        const applicantsValue = document.querySelector('.metric-card:nth-child(2) .metric-value');
        if (applicantsValue) applicantsValue.textContent = '983';

        // Update Total Revenue card
        const revenueValue = document.querySelector('.metric-card:nth-child(4) .metric-value');
        if (revenueValue) revenueValue.textContent = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        // Update Attendance Rate card
        const attendanceValue = document.querySelector('.metric-card:nth-child(5) .metric-value');
        if (attendanceValue) attendanceValue.textContent = `${Math.round(avgAttendanceRate)}%`;

        // Update attendance chart numbers
        const totalEmployValue = document.querySelector('.attendance-item:nth-child(1) .attendance-value');
        const onTimeValue = document.querySelector('.attendance-item:nth-child(2) .attendance-value');
        
        if (totalEmployValue) totalEmployValue.textContent = totalEmployees;
        if (onTimeValue) onTimeValue.textContent = Math.round(totalEmployees * (avgAttendanceRate / 100));
    }

    setupTaskManagement() {
        // Setup view toggle functionality
        const viewToggles = document.querySelectorAll('.view-toggle');
        viewToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                viewToggles.forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');
                this.switchTaskView(toggle.dataset.view);
            });
        });

        // Setup add task buttons
        const addTaskBtns = document.querySelectorAll('.add-task-btn');
        addTaskBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.showAddTaskModal();
            });
        });

        // Setup column menu buttons
        const columnMenus = document.querySelectorAll('.column-menu');
        columnMenus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showColumnMenu(e.target.closest('.kanban-column'));
            });
        });
    }

    switchTaskView(view) {
        const kanbanBoard = document.querySelector('.kanban-board');
        
        switch(view) {
            case 'kanban':
                kanbanBoard.style.display = 'grid';
                break;
            case 'table':
                kanbanBoard.style.display = 'none';
                this.showTableView();
                break;
            case 'list':
                kanbanBoard.style.display = 'none';
                this.showListView();
                break;
        }
    }

    showTableView() {
        const taskSection = document.querySelector('.task-section');
        const existingTable = taskSection.querySelector('.task-table');
        
        if (!existingTable) {
            const tableHTML = `
                <div class="task-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Task</th>
                                <th>Status</th>
                                <th>Assignee</th>
                                <th>Due Date</th>
                                <th>Priority</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Review Q4 reports</td>
                                <td><span class="status-badge new">New Request</span></td>
                                <td>John Doe</td>
                                <td>Mar 15, 2025</td>
                                <td><span class="priority high">High</span></td>
                            </tr>
                            <tr>
                                <td>Update employee handbook</td>
                                <td><span class="status-badge progress">In Progress</span></td>
                                <td>Jane Smith</td>
                                <td>Mar 20, 2025</td>
                                <td><span class="priority medium">Medium</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            taskSection.insertAdjacentHTML('beforeend', tableHTML);
        }
    }

    showListView() {
        const taskSection = document.querySelector('.task-section');
        const existingList = taskSection.querySelector('.task-list');
        
        if (!existingList) {
            const listHTML = `
                <div class="task-list">
                    <div class="task-item">
                        <div class="task-checkbox">
                            <input type="checkbox" id="task1">
                            <label for="task1"></label>
                        </div>
                        <div class="task-content">
                            <div class="task-title">Review Q4 reports</div>
                            <div class="task-meta">
                                <span class="task-status new">New Request</span>
                                <span class="task-assignee">John Doe</span>
                                <span class="task-due">Due Mar 15, 2025</span>
                            </div>
                        </div>
                    </div>
                    <div class="task-item">
                        <div class="task-checkbox">
                            <input type="checkbox" id="task2">
                            <label for="task2"></label>
                        </div>
                        <div class="task-content">
                            <div class="task-title">Update employee handbook</div>
                            <div class="task-meta">
                                <span class="task-status progress">In Progress</span>
                                <span class="task-assignee">Jane Smith</span>
                                <span class="task-due">Due Mar 20, 2025</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            taskSection.insertAdjacentHTML('beforeend', listHTML);
        }
    }

    showAddTaskModal() {
        // Create modal for adding tasks
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Task</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="task-form">
                    <div class="form-group">
                        <label>Task Title</label>
                        <input type="text" name="title" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" rows="3"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status">
                                <option value="new">New Request</option>
                                <option value="progress">In Progress</option>
                                <option value="complete">Complete</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select name="priority">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" name="dueDate">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Create Task</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup modal events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = modal.querySelector('.btn-secondary');
        const form = modal.querySelector('.task-form');

        closeBtn.addEventListener('click', () => this.closeModal(modal));
        cancelBtn.addEventListener('click', () => this.closeModal(modal));
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask(new FormData(form));
            this.closeModal(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    closeModal(modal) {
        modal.remove();
    }

    createTask(formData) {
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            status: formData.get('status'),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate')
        };

        // Update task counts
        this.tasks[taskData.status]++;
        this.updateTaskCounts();

        // Show success notification
        this.showNotification('Task created successfully!', 'success');
    }

    updateTaskCounts() {
        const taskCounts = document.querySelectorAll('.task-count');
        taskCounts[0].textContent = this.tasks.new;
        taskCounts[1].textContent = this.tasks.progress;
        taskCounts[2].textContent = this.tasks.complete;
    }

    showColumnMenu(column) {
        // Implementation for column menu dropdown
        console.log('Show column menu for:', column);
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'k':
                        e.preventDefault();
                        searchInput?.focus();
                        break;
                }
            }
        });

        // Metric card interactions
        const metricCards = document.querySelectorAll('.metric-card');
        metricCards.forEach(card => {
            const detailsBtn = card.querySelector('.metric-details-btn');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                    this.showMetricDetails(card);
                });
            }
        });

        // User menu functionality
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => {
                this.showUserMenu();
            });
        }

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    handleSearch(query) {
        // Implement search functionality
        console.log('Searching for:', query);
    }

    showMetricDetails(card) {
        const title = card.querySelector('.metric-title span').textContent;
        this.showNotification(`Viewing details for ${title}`, 'info');
    }

    showUserMenu() {
        // Create user menu dropdown
        const existingMenu = document.querySelector('.user-menu-dropdown');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'user-menu-dropdown';
        menu.innerHTML = `
            <div class="user-menu-item" onclick="window.location.href='/settings.html'">
                <i class="fas fa-user"></i>
                <span>Profile</span>
            </div>
            <div class="user-menu-item" onclick="window.location.href='/settings.html'">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </div>
            <div class="user-menu-divider"></div>
            <div class="user-menu-item" onclick="organizationsManager.logout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
            </div>
        `;

        const userProfile = document.querySelector('.user-profile');
        userProfile.appendChild(menu);

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.user-menu-btn')) {
                menu.remove();
            }
        });
    }

    async logout() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            // Always clear tokens regardless of response
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');

            if (response.ok) {
                console.log('✅ Logout successful');
            } else {
                console.error('❌ Logout failed:', response.status);
            }
            
            // Always redirect to login page
            window.location.href = '/index.html';
        } catch (error) {
            console.error('❌ Logout error:', error);
            // Clear tokens and redirect to login page
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/index.html';
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            mainContent.style.marginLeft = '280px';
        } else {
            sidebar.classList.add('collapsed');
            mainContent.style.marginLeft = '0';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);

        // Manual close
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => notification.remove());
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Initialize when DOM is loaded
let organizationsManager;
document.addEventListener('DOMContentLoaded', () => {
    organizationsManager = new OrganizationsManager();
});

// Add notification styles
const notificationStyles = `
<style>
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-left: 4px solid #3b82f6;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
}

.notification-success {
    border-left-color: #10b981;
}

.notification-error {
    border-left-color: #ef4444;
}

.notification-warning {
    border-left-color: #f59e0b;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.notification-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Task table and list styles */
.task-table table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
}

.task-table th,
.task-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
}

.task-table th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-badge.new {
    background: #dbeafe;
    color: #1e40af;
}

.status-badge.progress {
    background: #fef3c7;
    color: #92400e;
}

.priority {
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 500;
}

.priority.high {
    background: #fee2e2;
    color: #dc2626;
}

.priority.medium {
    background: #fef3c7;
    color: #92400e;
}

.task-list {
    margin-top: 16px;
}

.task-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
}

.task-checkbox input[type="checkbox"] {
    display: none;
}

.task-checkbox label {
    width: 20px;
    height: 20px;
    border: 2px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
}

.task-checkbox input[type="checkbox"]:checked + label {
    background: #3b82f6;
    border-color: #3b82f6;
}

.task-checkbox input[type="checkbox"]:checked + label::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
}

.task-content {
    flex: 1;
}

.task-title {
    font-weight: 500;
    color: #111827;
    margin-bottom: 4px;
}

.task-meta {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #6b7280;
}

.task-status {
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 500;
}

.task-status.new {
    background: #dbeafe;
    color: #1e40af;
}

.task-status.progress {
    background: #fef3c7;
    color: #92400e;
}

/* Modal styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.task-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 14px;
}

.form-group input,
.form-group textarea,
.form-group select {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
}

.btn-primary,
.btn-secondary {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
}

.btn-primary {
    background: #3b82f6;
    color: white;
}

.btn-primary:hover {
    background: #2563eb;
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
}

.btn-secondary:hover {
    background: #e5e7eb;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', notificationStyles); 