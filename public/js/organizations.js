// Organizations Page JavaScript
class OrganizationsManager {
    constructor() {
        this.currentUser = null;
        this.organizationData = null;
        this.membersData = [];
        this.init();
    }

    async init() {
        console.log('🏢 Initializing Organizations Manager...');
        
        try {
            // Initialize shared functionality
            if (window.sharedManager) {
                await window.sharedManager.init();
                this.currentUser = window.sharedManager.currentUser;
            }

            // Load organization information
            await this.loadOrganizationInfo();
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing Organizations Manager:', error);
            this.showError('Failed to initialize organizations page');
        }
    }

    async loadOrganizationInfo() {
        console.log('📡 Loading organization information...');
        
        try {
            this.showLoading();
            
            // Check if user is authenticated
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please log in to view organization information');
            }
            
            // Get user profile to check if they have an organization
            const profileResponse = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!profileResponse.ok) {
                if (profileResponse.status === 401) {
                    throw new Error('Please log in to view organization information');
                }
                throw new Error('Failed to fetch user profile');
            }

            const profileData = await profileResponse.json();
            this.currentUser = profileData.profile || profileData; // Handle both nested and direct structure
            
            console.log('👤 User profile data:', profileData);
            console.log('🏢 Organization ID:', this.currentUser.organization_id);
            console.log('👑 User role:', this.currentUser.role);

            if (!this.currentUser.organization_id) {
                console.log('❌ No organization ID found in profile');
                this.showNoOrganization();
                return;
            }

            console.log('✅ Organization ID found, fetching organization details...');

            // Load organization details
            const orgResponse = await fetch(`/api/organizations/${this.currentUser.organization_id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            console.log('📡 Organization API response status:', orgResponse.status);

            if (!orgResponse.ok) {
                const errorData = await orgResponse.json().catch(() => ({}));
                console.error('❌ Organization API error:', errorData);
                
                if (orgResponse.status === 401) {
                    throw new Error('Please log in to view organization information');
                } else if (orgResponse.status === 403) {
                    throw new Error('You do not have permission to view this organization');
                } else if (orgResponse.status === 404) {
                    // Handle case where organization doesn't exist but user has organization_id
                    console.error('❌ Organization not found but user has organization_id. This might be a data inconsistency.');
                    this.showError('Organization not found. This might be due to a data inconsistency. Please contact your administrator or try logging out and back in.');
                    return;
                } else {
                    throw new Error(`Failed to fetch organization details: ${errorData.error || orgResponse.statusText}`);
                }
            }

            const orgData = await orgResponse.json();
            console.log('✅ Organization data received:', orgData);
            
            this.organizationData = orgData.organization;
            this.membersData = orgData.members || [];

            // Display the data
            this.displayOrganizationInfo();
            this.displayMembers();
            
        } catch (error) {
            console.error('❌ Error loading organization info:', error);
            this.showError(`Failed to load organization information: ${error.message}`);
        }
    }

    displayOrganizationInfo() {
        console.log('📊 Displaying organization information...');
        
        const org = this.organizationData;
        if (!org) return;

        // Update organization header
        document.getElementById('org-name').textContent = org.name || 'Unknown Organization';
        document.getElementById('org-description').textContent = 'Organization details';
        document.getElementById('org-created').textContent = this.formatDate(org.created_at);
        document.getElementById('org-member-count').textContent = this.membersData.length;
        
        // Update organization creator information
        if (org.creator) {
            this.updateElementIfExists('creator-name', org.creator.name);
            this.updateElementIfExists('creator-email', org.creator.email);
        } else {
            this.updateElementIfExists('creator-name', 'No Creator Assigned');
            this.updateElementIfExists('creator-email', 'N/A');
        }

        // Update additional organization details if elements exist (using default values)
        this.updateElementIfExists('org-industry', 'Not specified');
        this.updateElementIfExists('org-size', 'Not specified');
        this.updateElementIfExists('org-website', 'Not specified');
        this.updateElementIfExists('org-phone', 'Not specified');
        this.updateElementIfExists('org-email', 'Not specified');
        this.updateElementIfExists('org-address', 'Not specified');
        this.updateElementIfExists('org-founded', 'Not specified');
        this.updateElementIfExists('org-business-type', 'Not specified');
        this.updateElementIfExists('org-timezone', 'Not specified');
        this.updateElementIfExists('org-currency', 'Not specified');
        this.updateElementIfExists('org-language', 'Not specified');

        // Update metrics if elements exist (using default values)
        this.updateElementIfExists('org-total-employees', this.membersData.length);
        this.updateElementIfExists('org-total-revenue', this.formatCurrency(0));
        this.updateElementIfExists('org-job-applicants', 0);
        this.updateElementIfExists('org-attendance', '0%');
        this.updateElementIfExists('org-tasks', 0);

        // Show edit button for admins
        if (this.currentUser && ['admin', 'super_admin'].includes(this.currentUser.role)) {
            document.getElementById('edit-org-btn').style.display = 'inline-flex';
            document.getElementById('invite-members-btn').style.display = 'inline-flex';
        }

        // Hide loading, show content
        this.hideLoading();
        document.getElementById('organization-content').style.display = 'block';
    }

    displayMembers() {
        console.log('👥 Displaying organization members...');
        
        const membersGrid = document.getElementById('members-grid');
        const noMembers = document.getElementById('no-members');
        
        if (!this.membersData || this.membersData.length === 0) {
            membersGrid.style.display = 'none';
            noMembers.style.display = 'block';
            return;
        }

        membersGrid.style.display = 'grid';
        noMembers.style.display = 'none';

        // Clear existing members
        membersGrid.innerHTML = '';

        // Add each member
        this.membersData.forEach(member => {
            const memberCard = this.createMemberCard(member);
            membersGrid.appendChild(memberCard);
        });
    }

    createMemberCard(member) {
        const card = document.createElement('div');
        card.className = 'member-card';

        const initials = this.getInitials(member.first_name, member.last_name);
        const roleClass = member.role || 'employee';
        const statusClass = member.is_active ? 'active' : 'inactive';

        card.innerHTML = `
            <div class="member-header">
                <div class="member-avatar ${roleClass}">
                    ${initials}
                </div>
                <div class="member-info">
                    <h4>${member.first_name} ${member.last_name}</h4>
                    <p>${member.email}</p>
                    <span class="member-role ${roleClass}">${this.formatRole(member.role)}</span>
                </div>
            </div>
            <div class="member-status">
                <div class="status-indicator ${statusClass}"></div>
                <span class="status-text">${member.is_active ? 'Active' : 'Inactive'}</span>
            </div>
        `;

        return card;
    }

    getInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last;
    }

    formatRole(role) {
        if (!role) return 'Employee';
        
        const roleMap = {
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'manager': 'Manager',
            'organization_member': 'Organization Member',
            'employee': 'Employee'
        };
        
        return roleMap[role] || role;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatSize(size) {
        if (!size) return 'Unknown';
        
        const sizeMap = {
            'startup': 'Startup',
            'small': 'Small (1-50)',
            'medium': 'Medium (51-200)',
            'large': 'Large (201-1000)',
            'enterprise': 'Enterprise (1000+)'
        };
        
        return sizeMap[size] || size;
    }

    formatAddress(org) {
        // Since the current schema doesn't have address fields, return a default message
        return 'Address not available';
    }

    formatCurrency(amount) {
        if (!amount) return '$0.00';
        
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    updateElementIfExists(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || 'N/A';
        }
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('member-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterMembers(e.target.value);
            });
        }

        // Role filter
        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Edit organization button
        const editBtn = document.getElementById('edit-org-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.editOrganization();
            });
        }

        // Edit organization modal events
        const editForm = document.getElementById('edit-org-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('edit-org-name').value,
                    description: document.getElementById('edit-org-description').value
                };
                this.updateOrganization(formData);
            });
        }

        // Modal close buttons
        const closeEditModal = document.getElementById('close-edit-modal');
        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        // Invite members button
        const inviteBtn = document.getElementById('invite-members-btn');
        if (inviteBtn) {
            inviteBtn.addEventListener('click', () => {
                this.showInviteModal();
            });
        }

        // Invite modal events
        const closeInviteModal = document.getElementById('close-invite-modal');
        if (closeInviteModal) {
            closeInviteModal.addEventListener('click', () => {
                this.closeInviteModal();
            });
        }

        const cancelInviteBtn = document.getElementById('cancel-invite-btn');
        if (cancelInviteBtn) {
            cancelInviteBtn.addEventListener('click', () => {
                this.closeInviteModal();
            });
        }

        const generateInviteBtn = document.getElementById('generate-invite-btn');
        if (generateInviteBtn) {
            generateInviteBtn.addEventListener('click', () => {
                this.generateInviteLink();
            });
        }

        const copyInviteLinkBtn = document.getElementById('copy-invite-link');
        if (copyInviteLinkBtn) {
            copyInviteLinkBtn.addEventListener('click', () => {
                this.copyInviteLink();
            });
        }

        const generateNewInviteBtn = document.getElementById('generate-new-invite');
        if (generateNewInviteBtn) {
            generateNewInviteBtn.addEventListener('click', () => {
                this.resetInviteForm();
            });
        }

        const closeInviteResultBtn = document.getElementById('close-invite-result');
        if (closeInviteResultBtn) {
            closeInviteResultBtn.addEventListener('click', () => {
                this.closeInviteModal();
            });
        }

        // Cancel edit button
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        // Delete organization button
        const deleteOrgBtn = document.getElementById('delete-org-btn');
        if (deleteOrgBtn) {
            deleteOrgBtn.addEventListener('click', () => {
                this.showDeleteConfirmation();
            });
        }

        // Delete confirmation modal events
        const closeDeleteModal = document.getElementById('close-delete-modal');
        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteOrganization();
            });
        }

        // Close modals when clicking outside
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.sharedManager && window.sharedManager.logout) {
                    window.sharedManager.logout();
                } else {
                    // Fallback logout
                    localStorage.removeItem('token');
                    window.location.href = '/login.html';
                }
            });
        }

        // Retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadOrganizationInfo();
            });
        }

        // Add event listeners for any buttons with data-action attributes
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.getAttribute('data-action');
                this.handleAction(action, e.target);
            }
        });
    }

    handleAction(action, element) {
        switch (action) {
            case 'edit-organization':
                this.editOrganization();
                break;
            case 'view-member':
                const memberId = element.getAttribute('data-member-id');
                this.viewMember(memberId);
                break;
            case 'edit-member':
                const memberIdToEdit = element.getAttribute('data-member-id');
                this.editMember(memberIdToEdit);
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    filterMembers(searchTerm) {
        const memberCards = document.querySelectorAll('.member-card');
        
        memberCards.forEach(card => {
            const name = card.querySelector('h4').textContent.toLowerCase();
            const email = card.querySelector('p').textContent.toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            if (name.includes(searchLower) || email.includes(searchLower)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    applyFilters() {
        const roleFilter = document.getElementById('role-filter').value;
        const statusFilter = document.getElementById('status-filter').value;
        const memberCards = document.querySelectorAll('.member-card');
        
        memberCards.forEach(card => {
            const role = card.querySelector('.member-role').textContent.toLowerCase();
            const status = card.querySelector('.status-text').textContent.toLowerCase();
            
            const roleMatch = !roleFilter || role === roleFilter.toLowerCase();
            const statusMatch = !statusFilter || status === statusFilter.toLowerCase();
            
            if (roleMatch && statusMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    editOrganization() {
        console.log('✏️ Edit organization clicked');
        
        if (!this.organizationData) {
            console.error('❌ No organization data available');
            return;
        }

        // Populate the modal with current data
        document.getElementById('edit-org-name').value = this.organizationData.name || '';
        document.getElementById('edit-org-description').value = this.organizationData.description || '';
        
        // Show the modal
        document.getElementById('edit-org-modal').style.display = 'flex';
    }

    async updateOrganization(formData) {
        try {
            console.log('📝 Updating organization...');
            
            const response = await fetch(`/api/organizations/${this.currentUser.organization_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update organization');
            }

            const result = await response.json();
            console.log('✅ Organization updated:', result);
            
            // Update local data
            this.organizationData = { ...this.organizationData, ...result.organization };
            
            // Refresh the display
            this.displayOrganizationInfo();
            
            // Close modal
            this.closeEditModal();
            
            // Show success message
            this.showSuccessMessage('Organization updated successfully!');
            
        } catch (error) {
            console.error('❌ Error updating organization:', error);
            this.showErrorMessage(`Failed to update organization: ${error.message}`);
        }
    }

    async deleteOrganization() {
        try {
            console.log('🗑️ Deleting organization...');
            
            const response = await fetch(`/api/organizations/${this.currentUser.organization_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete organization');
            }

            const result = await response.json();
            console.log('✅ Organization deleted:', result);
            
            // Close modal
            this.closeDeleteModal();
            
            // Show success message and redirect
            this.showSuccessMessage('Organization deleted successfully! Redirecting...');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error deleting organization:', error);
            this.showErrorMessage(`Failed to delete organization: ${error.message}`);
        }
    }

    closeEditModal() {
        document.getElementById('edit-org-modal').style.display = 'none';
    }

    closeDeleteModal() {
        document.getElementById('delete-org-modal').style.display = 'none';
    }

    showDeleteConfirmation() {
        document.getElementById('delete-org-modal').style.display = 'flex';
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-weight: 500;
        `;
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    showErrorMessage(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-weight: 500;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    viewMember(memberId) {
        console.log('👤 View member clicked:', memberId);
        // TODO: Implement member viewing
        alert('Member viewing feature coming soon!');
    }

    editMember(memberId) {
        console.log('✏️ Edit member clicked:', memberId);
        // TODO: Implement member editing
        alert('Member editing feature coming soon!');
    }

    showLoading() {
        document.getElementById('loading-state').style.display = 'flex';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('organization-content').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('organization-content').style.display = 'none';
        document.getElementById('error-state').style.display = 'flex';
        document.getElementById('error-message').textContent = message;
    }

    showNoOrganization() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('organization-content').style.display = 'none';
        document.getElementById('error-state').style.display = 'flex';
        document.getElementById('error-message').innerHTML = `
            <h3>No Organization Found</h3>
            <p>You are not currently part of any organization.</p>
            <p>To join an organization, you can:</p>
            <ul>
                <li>Ask your administrator to send you an invitation</li>
                <li>Use an invitation code if you have one</li>
                <li>Create a new organization if you're an administrator</li>
            </ul>
            <p>If you believe this is an error, please contact your system administrator.</p>
            <p><strong>Note:</strong> You need to be assigned to an organization to view organization details.</p>
        `;
    }

    // Invite functionality methods
    showInviteModal() {
        console.log('📧 Showing invite modal');
        document.getElementById('invite-members-modal').style.display = 'flex';
        this.resetInviteForm();
    }

    closeInviteModal() {
        console.log('📧 Closing invite modal');
        document.getElementById('invite-members-modal').style.display = 'none';
    }

    resetInviteForm() {
        console.log('🔄 Resetting invite form');
        document.getElementById('invite-role').value = 'organization_member';
        document.getElementById('invite-expiry').value = '7';
        document.getElementById('invite-result').style.display = 'none';
        document.getElementById('generate-invite-btn').classList.remove('loading');
        document.getElementById('generate-invite-btn').disabled = false;
    }

    async generateInviteLink() {
        try {
            console.log('🔗 Generating invite link...');
            
            const generateBtn = document.getElementById('generate-invite-btn');
            generateBtn.classList.add('loading');
            generateBtn.disabled = true;

            const role = document.getElementById('invite-role').value;
            const expiryDays = document.getElementById('invite-expiry').value;

            const response = await fetch('/api/auth/generate-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    role: role,
                    expiry_days: parseInt(expiryDays)
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate invite link');
            }

            const result = await response.json();
            console.log('✅ Invite link generated:', result);

            // Display the invite link
            document.getElementById('invite-link').value = result.invite_link;
            document.getElementById('invite-result').style.display = 'block';

            // Show success message
            this.showSuccessMessage('Invite link generated successfully!');

        } catch (error) {
            console.error('❌ Error generating invite link:', error);
            this.showErrorMessage(`Failed to generate invite link: ${error.message}`);
        } finally {
            const generateBtn = document.getElementById('generate-invite-btn');
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    }

    async copyInviteLink() {
        try {
            const inviteLink = document.getElementById('invite-link');
            await navigator.clipboard.writeText(inviteLink.value);
            
            const copyBtn = document.getElementById('copy-invite-link');
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            
            this.showSuccessMessage('Invite link copied to clipboard!');
            
            // Reset button after 2 seconds
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.classList.remove('copied');
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error copying invite link:', error);
            this.showErrorMessage('Failed to copy invite link to clipboard');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏢 Organizations page loaded');
    window.organizationsManager = new OrganizationsManager();
});

// Global function for retry
function loadOrganizationInfo() {
    if (window.organizationsManager) {
        window.organizationsManager.loadOrganizationInfo();
    }
}

 