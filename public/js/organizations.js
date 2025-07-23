// Organizations Page JavaScript
class OrganizationsManager {
    constructor() {
        this.currentUser = null;
        this.organizationData = null;
        this.membersData = [];
        this.init();
    }

    // Translation helper method
    t(key, options = {}) {
        if (window.i18next) {
            return window.i18next.t(key, options);
        }
        return key;
    }

    async init() {
        console.log('🏢 Initializing Organizations Manager...');
        
        try {
            // Initialize shared functionality
            if (window.sharedManager) {
                await window.sharedManager.init();
                this.currentUser = window.sharedManager.currentUser;
            }

            // Wait for i18next to be ready
            if (window.i18next) {
                await window.i18next.ready;
            }

            // Load organization information
            await this.loadOrganizationInfo();
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing Organizations Manager:', error);
            this.showError(this.t('common:error'));
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
                    throw new Error(this.t('auth:session_expired'));
                } else if (orgResponse.status === 403) {
                    throw new Error(this.t('auth:unauthorized'));
                } else if (orgResponse.status === 404) {
                    // Handle case where organization doesn't exist but user has organization_id
                    console.error('❌ Organization not found but user has organization_id. This might be a data inconsistency.');
                    this.showError(this.t('organizations:organization_not_found'));
                    return;
                } else {
                    throw new Error(`${this.t('common:error')}: ${errorData.error || orgResponse.statusText}`);
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
            document.getElementById('add-member-btn').style.display = 'inline-flex';
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
        card.setAttribute('data-member-id', member.id);
        
        // Only show pointer cursor if user can view this member
        if (this.canViewMember(member)) {
            card.style.cursor = 'pointer';
        } else {
            card.style.cursor = 'default';
            card.classList.add('no-access');
        }

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
            <div class="member-actions">
                <button class="member-action-btn view-btn" title="${this.canViewMember(member) ? 'View Details' : 'You can only view your own profile'}" ${!this.canViewMember(member) ? 'disabled' : ''}>
                    <i class="fas fa-eye"></i>
                </button>
                ${this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin' ? `
                    <button class="member-action-btn edit-btn" title="Edit Member">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="member-action-btn remove-btn" title="Remove from Organization">
                        <i class="fas fa-user-minus"></i>
                    </button>
                ` : ''}
            </div>
        `;

        // Add click event listeners
        this.addMemberCardEventListeners(card, member);

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

        // Add member button
        const addMemberBtn = document.getElementById('add-member-btn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => {
                this.showAddMemberModal();
            });
        }

        // Member detail modal close button
        const closeMemberDetailModal = document.getElementById('close-member-detail-modal');
        if (closeMemberDetailModal) {
            closeMemberDetailModal.addEventListener('click', () => {
                this.closeMemberDetailModal();
            });
        }

        // Member detail modal backdrop click
        const memberDetailModal = document.getElementById('member-detail-modal');
        if (memberDetailModal) {
            memberDetailModal.addEventListener('click', (e) => {
                if (e.target === memberDetailModal) {
                    this.closeMemberDetailModal();
                }
            });
        }

        // Member detail tabs
        const memberTabs = document.querySelectorAll('.member-tab');
        memberTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchMemberTab(tabName);
            });
        });

        // Remove member modal close button
        const closeRemoveMemberModal = document.getElementById('close-remove-member-modal');
        if (closeRemoveMemberModal) {
            closeRemoveMemberModal.addEventListener('click', () => {
                this.closeRemoveMemberModal();
            });
        }

        // Remove member modal backdrop click
        const removeMemberModal = document.getElementById('remove-member-modal');
        if (removeMemberModal) {
            removeMemberModal.addEventListener('click', (e) => {
                if (e.target === removeMemberModal) {
                    this.closeRemoveMemberModal();
                }
            });
        }

        // Cancel remove member button
        const cancelRemoveMember = document.getElementById('cancel-remove-member');
        if (cancelRemoveMember) {
            cancelRemoveMember.addEventListener('click', () => {
                this.closeRemoveMemberModal();
            });
        }

        // Edit member modal close button
        const closeEditMemberModal = document.getElementById('close-edit-member-modal');
        if (closeEditMemberModal) {
            closeEditMemberModal.addEventListener('click', () => {
                this.closeEditMemberModal();
            });
        }

        // Edit member modal backdrop click
        const editMemberModal = document.getElementById('edit-member-modal');
        if (editMemberModal) {
            editMemberModal.addEventListener('click', (e) => {
                if (e.target === editMemberModal) {
                    this.closeEditMemberModal();
                }
            });
        }

        // Edit member tabs
        const editTabs = document.querySelectorAll('.edit-tab');
        editTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchEditTab(tabName);
            });
        });

        // Cancel edit member button
        const cancelEditMember = document.getElementById('cancel-edit-member');
        if (cancelEditMember) {
            cancelEditMember.addEventListener('click', () => {
                this.closeEditMemberModal();
            });
        }

        // Edit member form submission
        const editMemberForm = document.getElementById('edit-member-form');
        if (editMemberForm) {
            editMemberForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditMemberSubmit();
            });
        }

        // Step-by-step invite functionality
        const methodOptions = document.querySelectorAll('.method-option');
        methodOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const method = e.currentTarget.dataset.method;
                this.selectInviteMethod(method);
            });
        });

        // Step navigation buttons
        const nextStepBtn = document.getElementById('next-step-btn');
        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => {
                this.goToStep(2);
            });
        }

        const prevStepBtn = document.getElementById('prev-step-btn');
        if (prevStepBtn) {
            prevStepBtn.addEventListener('click', () => {
                this.goToStep(1);
            });
        }

        // Email invite form
        const emailInviteForm = document.getElementById('email-invite-form-element');
        if (emailInviteForm) {
            emailInviteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendEmailInvitation();
            });
        }

        // Send invitation button
        const sendInviteBtn = document.getElementById('send-invite-btn');
        if (sendInviteBtn) {
            sendInviteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.sendEmailInvitation();
            });
        }

        // File upload event handlers
        this.setupFileUploadHandlers();

        // Link invite form
        const linkInviteForm = document.getElementById('link-invite-form-element');
        if (linkInviteForm) {
            linkInviteForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.generateInviteLink();
            });
        }

        // Generate invite link button
        const generateInviteBtn = document.getElementById('generate-invite-btn');
        if (generateInviteBtn) {
            generateInviteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateInviteLink();
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



        const cancelLinkBtn = document.getElementById('cancel-link-btn');
        if (cancelLinkBtn) {
            cancelLinkBtn.addEventListener('click', () => {
                this.closeInviteModal();
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
                this.goToStep(1);
            });
        }

        const closeInviteResultBtn = document.getElementById('close-invite-result');
        if (closeInviteResultBtn) {
            closeInviteResultBtn.addEventListener('click', () => {
                this.closeInviteModal();
            });
        }

        const closeLinkResultBtn = document.getElementById('close-link-result');
        if (closeLinkResultBtn) {
            closeLinkResultBtn.addEventListener('click', () => {
                this.closeInviteModal();
            });
        }

        const sendAnotherInviteBtn = document.getElementById('send-another-invite');
        if (sendAnotherInviteBtn) {
            sendAnotherInviteBtn.addEventListener('click', () => {
                this.resetInviteForm();
                this.goToStep(1);
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

        // Add member modal events
        const closeAddMemberModal = document.getElementById('close-add-member-modal');
        if (closeAddMemberModal) {
            closeAddMemberModal.addEventListener('click', () => {
                this.closeAddMemberModal();
            });
        }

        const cancelAddMemberBtn = document.getElementById('cancel-add-member-btn');
        if (cancelAddMemberBtn) {
            cancelAddMemberBtn.addEventListener('click', () => {
                this.closeAddMemberModal();
            });
        }

        const addMemberForm = document.getElementById('add-member-form');
        if (addMemberForm) {
            addMemberForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addOfflineMember();
            });
        }

        // Submit form button (for step 4)
        const submitFormBtn = document.getElementById('add-member-submit-form-btn');
        if (submitFormBtn) {
            submitFormBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addOfflineMember();
            });
        }

        // Add member modal step navigation
        const addMemberNextStepBtn = document.getElementById('add-member-next-step-btn');
        const addMemberPrevStepBtn = document.getElementById('add-member-prev-step-btn');
        const addMemberSubmitFormBtn = document.getElementById('add-member-submit-form-btn');

        if (addMemberNextStepBtn) {
            addMemberNextStepBtn.addEventListener('click', () => {
                this.nextAddMemberStep();
            });
        }

        if (addMemberPrevStepBtn) {
            addMemberPrevStepBtn.addEventListener('click', () => {
                this.previousAddMemberStep();
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

    addMemberCardEventListeners(card, member) {
        // View member details
        const viewBtn = card.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.canViewMember(member)) {
                    this.viewMember(member.id);
                } else {
                    this.showErrorMessage('You can only view your own profile');
                }
            });
        }

        // Edit member
        const editBtn = card.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editMember(member.id);
            });
        }

        // Remove member
        const removeBtn = card.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showRemoveMemberConfirmation(member);
            });
        }

        // Card click to view details - only allow if user has permission
        card.addEventListener('click', () => {
            // Check if user can view this member
            if (this.canViewMember(member)) {
                this.viewMember(member.id);
            } else {
                this.showErrorMessage('You can only view your own profile');
            }
        });
    }

    canViewMember(member) {
        // Admins can view any member in their organization
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin') {
            return true;
        }
        
        // Regular members can only view themselves
        return member.id === this.currentUser.id;
    }

    async viewMember(memberId) {
        console.log('👤 View member clicked:', memberId);
        try {
            this.showMemberDetailLoading();
            this.showMemberDetailModal();

            const response = await fetch(`/api/organizations/members/${memberId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch member details: ${response.status}`);
            }

            const memberData = await response.json();
            this.displayMemberDetails(memberData.member);
            
        } catch (error) {
            console.error('❌ Error viewing member:', error);
            this.showErrorMessage('Failed to load member details');
        }
    }

    async editMember(memberId) {
        console.log('✏️ Edit member clicked:', memberId);
        try {
            this.showEditMemberLoading();
            this.showEditMemberModal();

            const response = await fetch(`/api/organizations/members/${memberId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch member details: ${response.status}`);
            }

            const memberData = await response.json();
            this.populateEditMemberForm(memberData.member);
            this.currentEditingMemberId = memberId;
            
        } catch (error) {
            console.error('❌ Error editing member:', error);
            this.showErrorMessage('Failed to load member information for editing');
        }
    }

    showEditMemberModal() {
        document.getElementById('edit-member-modal').style.display = 'flex';
    }

    closeEditMemberModal() {
        document.getElementById('edit-member-modal').style.display = 'none';
        this.currentEditingMemberId = null;
    }

    showEditMemberLoading() {
        document.getElementById('edit-member-loading').style.display = 'flex';
        document.getElementById('edit-member-form').style.display = 'none';
    }

    hideEditMemberLoading() {
        document.getElementById('edit-member-loading').style.display = 'none';
        document.getElementById('edit-member-form').style.display = 'block';
    }

    populateEditMemberForm(member) {
        console.log('📝 Populating edit form with member data:', member);
        
        // Update modal title
        document.getElementById('edit-member-title').textContent = `Edit ${member.first_name} ${member.last_name}`;

        // Personal Info
        document.getElementById('edit-first-name').value = member.first_name || '';
        document.getElementById('edit-last-name').value = member.last_name || '';
        document.getElementById('edit-email').value = member.email || '';
        document.getElementById('edit-phone').value = member.phone || '';
        document.getElementById('edit-date-of-birth').value = member.date_of_birth ? member.date_of_birth.split('T')[0] : '';
        document.getElementById('edit-bio').value = member.bio || '';

        // Address Info
        document.getElementById('edit-address-line1').value = member.address_line1 || '';
        document.getElementById('edit-address-line2').value = member.address_line2 || '';
        document.getElementById('edit-city').value = member.city || '';
        document.getElementById('edit-state').value = member.state_province || '';
        document.getElementById('edit-postal').value = member.postal_code || '';
        document.getElementById('edit-country').value = member.country || '';

        // Emergency Contact
        document.getElementById('edit-emergency-name').value = member.emergency_contact_name || '';
        document.getElementById('edit-emergency-phone').value = member.emergency_contact_phone || '';

        // Employment Info
        document.getElementById('edit-job-title').value = member.job_title || '';
        document.getElementById('edit-department').value = member.department || '';
        document.getElementById('edit-employment-type').value = member.employment_type || '';
        document.getElementById('edit-work-location').value = member.work_location || '';
        document.getElementById('edit-start-date').value = member.employment_start_date ? member.employment_start_date.split('T')[0] : '';
        document.getElementById('edit-end-date').value = member.employment_end_date ? member.employment_end_date.split('T')[0] : '';
        document.getElementById('edit-salary').value = member.salary || '';
        document.getElementById('edit-currency').value = member.currency || 'EUR';

        // Banking Info
        document.getElementById('edit-iban').value = member.iban || '';
        document.getElementById('edit-bank-name').value = member.bank_name || '';
        document.getElementById('edit-bank-country').value = member.bank_country || '';

        // Role & Status
        document.getElementById('edit-role').value = member.role || 'employee';
        document.getElementById('edit-status').value = member.is_active ? 'true' : 'false';

        this.hideEditMemberLoading();
    }

    switchEditTab(tabName) {
        console.log('📑 Switching to edit tab:', tabName);
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.edit-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.edit-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`edit-${tabName}-tab`).classList.add('active');
    }

    async saveMemberChanges(formData) {
        console.log('💾 Saving member changes:', formData);
        
        try {
            const response = await fetch(`/api/organizations/members/${this.currentEditingMemberId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update member');
            }

            const result = await response.json();
            
            // Close modal
            this.closeEditMemberModal();
            
            // Show success message
            this.showSuccessMessage('Member updated successfully');
            
            // Refresh the members list
            await this.loadOrganizationInfo();
            
        } catch (error) {
            console.error('❌ Error saving member changes:', error);
            this.showErrorMessage(error.message);
        }
    }

    handleEditMemberSubmit() {
        console.log('📝 Handling edit member form submission');
        
        const form = document.getElementById('edit-member-form');
        const formData = new FormData(form);
        
        // Convert FormData to object
        const memberData = {};
        for (let [key, value] of formData.entries()) {
            // Handle boolean values
            if (key === 'is_active') {
                memberData[key] = value === 'true';
            } else if (key === 'salary') {
                memberData[key] = value ? parseFloat(value) : null;
            } else {
                memberData[key] = value || null;
            }
        }
        
        console.log('📊 Form data to save:', memberData);
        
        // Validate required fields
        if (!memberData.first_name || !memberData.last_name || !memberData.email) {
            this.showErrorMessage('First name, last name, and email are required');
            return;
        }
        
        // Save the changes
        this.saveMemberChanges(memberData);
    }

    showMemberDetailModal() {
        document.getElementById('member-detail-modal').style.display = 'flex';
    }

    closeMemberDetailModal() {
        document.getElementById('member-detail-modal').style.display = 'none';
    }

    showMemberDetailLoading() {
        document.getElementById('member-detail-loading').style.display = 'flex';
        document.getElementById('member-detail-content').style.display = 'none';
        document.getElementById('member-detail-actions').style.display = 'none';
    }

    hideMemberDetailLoading() {
        document.getElementById('member-detail-loading').style.display = 'none';
        document.getElementById('member-detail-content').style.display = 'block';
        document.getElementById('member-detail-actions').style.display = 'flex';
    }

    displayMemberDetails(member) {
        console.log('🎨 Displaying member details:', member);
        
        // Update header
        document.getElementById('member-detail-title').textContent = `${member.first_name} ${member.last_name}`;
        document.getElementById('member-detail-name').textContent = `${member.first_name} ${member.last_name}`;
        document.getElementById('member-detail-email').textContent = member.email;
        document.getElementById('member-detail-role').textContent = this.formatRole(member.role);
        document.getElementById('member-detail-status').textContent = member.is_active ? 'Active' : 'Inactive';
        document.getElementById('member-detail-status').className = `member-detail-status ${member.is_active ? 'active' : 'inactive'}`;

        // Update avatar
        const avatar = document.getElementById('member-detail-avatar');
        avatar.innerHTML = this.getInitials(member.first_name, member.last_name);
        avatar.className = `member-detail-avatar ${member.role || 'employee'}`;

        // Update personal info
        document.getElementById('member-phone').textContent = member.phone || 'N/A';
        document.getElementById('member-dob').textContent = member.date_of_birth ? this.formatDate(member.date_of_birth) : 'N/A';
        document.getElementById('member-bio').textContent = member.bio || 'N/A';

        // Update address info
        document.getElementById('member-address1').textContent = member.address_line1 || 'N/A';
        document.getElementById('member-address2').textContent = member.address_line2 || 'N/A';
        document.getElementById('member-city').textContent = member.city || 'N/A';
        document.getElementById('member-state').textContent = member.state_province || 'N/A';
        document.getElementById('member-postal').textContent = member.postal_code || 'N/A';
        document.getElementById('member-country').textContent = member.country || 'N/A';

        // Update emergency contact
        document.getElementById('member-emergency-name').textContent = member.emergency_contact_name || 'N/A';
        document.getElementById('member-emergency-phone').textContent = member.emergency_contact_phone || 'N/A';

        // Update employment info
        document.getElementById('member-job-title').textContent = member.job_title || 'N/A';
        document.getElementById('member-department').textContent = member.department || 'N/A';
        document.getElementById('member-employment-type').textContent = member.employment_type || 'N/A';
        document.getElementById('member-work-location').textContent = member.work_location || 'N/A';
        document.getElementById('member-start-date').textContent = member.employment_start_date ? this.formatDate(member.employment_start_date) : 'N/A';
        document.getElementById('member-end-date').textContent = member.employment_end_date ? this.formatDate(member.employment_end_date) : 'N/A';
        document.getElementById('member-salary').textContent = member.salary ? this.formatCurrency(member.salary) : 'N/A';
        document.getElementById('member-currency').textContent = member.currency || 'N/A';

        // Update banking info
        document.getElementById('member-iban').textContent = member.iban || 'N/A';
        document.getElementById('member-bank-name').textContent = member.bank_name || 'N/A';
        document.getElementById('member-bank-country').textContent = member.bank_country || 'N/A';

        // Update documents info
        document.getElementById('member-tax-doc').textContent = member.tax_id_document ? 'Document uploaded' : 'N/A';
        document.getElementById('member-national-doc').textContent = member.national_id_document ? 'Document uploaded' : 'N/A';
        document.getElementById('member-passport-doc').textContent = member.passport_document ? 'Document uploaded' : 'N/A';

        // Show/hide actions based on user role
        const actionsDiv = document.getElementById('member-detail-actions');
        if (this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin') {
            actionsDiv.style.display = 'flex';
            // Set up action buttons
            document.getElementById('edit-member-btn').onclick = () => this.editMember(member.id);
            document.getElementById('remove-member-btn').onclick = () => this.showRemoveMemberConfirmation(member);
        } else {
            actionsDiv.style.display = 'none';
        }

        this.hideMemberDetailLoading();
    }

    showRemoveMemberConfirmation(member) {
        console.log('🗑️ Show remove member confirmation:', member);
        
        // Update confirmation modal content
        document.getElementById('remove-member-name').textContent = `${member.first_name} ${member.last_name}`;
        document.getElementById('remove-member-email').textContent = member.email;
        document.getElementById('remove-member-role').textContent = this.formatRole(member.role);
        
        // Show confirmation modal
        document.getElementById('remove-member-modal').style.display = 'flex';
        
        // Set up confirmation button
        document.getElementById('confirm-remove-member').onclick = () => this.removeMember(member.id);
    }

    closeRemoveMemberModal() {
        document.getElementById('remove-member-modal').style.display = 'none';
    }

    switchMemberTab(tabName) {
        console.log('📑 Switching to member tab:', tabName);
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.member-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.member-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    async removeMember(memberId) {
        console.log('🗑️ Removing member:', memberId);
        
        try {
            const response = await fetch(`/api/organizations/members/${memberId}/remove`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove member');
            }

            const result = await response.json();
            
            // Close modals
            this.closeRemoveMemberModal();
            this.closeMemberDetailModal();
            
            // Show success message
            this.showSuccessMessage('Member removed from organization successfully');
            
            // Refresh the members list
            await this.loadOrganizationInfo();
            
        } catch (error) {
            console.error('❌ Error removing member:', error);
            this.showErrorMessage(error.message);
        }
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
        this.goToStep(1);
    }

    closeInviteModal() {
        console.log('📧 Closing invite modal');
        document.getElementById('invite-members-modal').style.display = 'none';
    }

    // Add member functionality methods
    showAddMemberModal() {
        console.log('👤 Showing add member modal');
        document.getElementById('add-member-modal').style.display = 'flex';
        this.resetAddMemberForm();
        this.goToAddMemberStep(1);
    }

    closeAddMemberModal() {
        console.log('👤 Closing add member modal');
        document.getElementById('add-member-modal').style.display = 'none';
    }

    resetAddMemberForm() {
        console.log('🔄 Resetting add member form');
        const form = document.getElementById('add-member-form');
        if (form) {
            form.reset();
        }
        // Reset to first step
        this.goToAddMemberStep(1);
    }

    // Multi-step form navigation for add member modal
    nextAddMemberStep() {
        console.log('🔄 Next button clicked');
        const currentStep = this.getCurrentAddMemberStep();
        const nextStep = currentStep + 1;
        
        console.log(`Current step: ${currentStep}, Next step: ${nextStep}`);
        
        if (this.validateCurrentStep(currentStep)) {
            console.log('✅ Validation passed, going to next step');
            this.goToAddMemberStep(nextStep);
        } else {
            console.log('❌ Validation failed');
        }
    }

    previousAddMemberStep() {
        const currentStep = this.getCurrentAddMemberStep();
        const prevStep = currentStep - 1;
        
        if (prevStep >= 1) {
            this.goToAddMemberStep(prevStep);
        }
    }

    getCurrentAddMemberStep() {
        const activeStep = document.querySelector('#add-member-modal .form-step.active');
        const stepNumber = activeStep ? parseInt(activeStep.dataset.step) : 1;
        console.log(`🔍 Current step detected: ${stepNumber}`);
        return stepNumber;
    }

    goToAddMemberStep(stepNumber) {
        console.log(`🔄 Going to add member step ${stepNumber}`);
        
        // Hide all steps
        const steps = document.querySelectorAll('#add-member-modal .form-step');
        console.log(`Found ${steps.length} form steps`);
        steps.forEach(step => {
            step.classList.remove('active');
            console.log(`Step ${step.dataset.step}: ${step.classList.contains('active') ? 'active' : 'inactive'}`);
        });
        
        // Show target step
        const targetStep = document.querySelector(`#add-member-modal .form-step[data-step="${stepNumber}"]`);
        if (targetStep) {
            targetStep.classList.add('active');
            console.log(`✅ Activated step ${stepNumber}`);
        } else {
            console.log(`❌ Step ${stepNumber} not found`);
        }
        
        // Update progress indicator
        this.updateAddMemberStepProgress(stepNumber);
        
        // Update navigation buttons
        this.updateAddMemberStepButtons(stepNumber);
    }

    updateAddMemberStepProgress(stepNumber) {
        const steps = document.querySelectorAll('#add-member-modal .form-step-progress .step');
        
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNum < stepNumber) {
                step.classList.add('completed');
            } else if (stepNum === stepNumber) {
                step.classList.add('active');
            }
        });
    }

    updateAddMemberStepButtons(stepNumber) {
        const prevBtn = document.getElementById('add-member-prev-step-btn');
        const nextBtn = document.getElementById('add-member-next-step-btn');
        const submitBtn = document.getElementById('add-member-submit-form-btn');
        
        if (prevBtn) {
            prevBtn.style.display = stepNumber > 1 ? 'inline-flex' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.style.display = stepNumber < 4 ? 'inline-flex' : 'none';
        }
        
        if (submitBtn) {
            submitBtn.style.display = stepNumber === 4 ? 'inline-flex' : 'none';
        }
    }

    validateCurrentStep(stepNumber) {
        const currentStep = document.querySelector(`#add-member-modal .form-step[data-step="${stepNumber}"]`);
        if (!currentStep) return false;
        
        // Only validate required fields on step 1 (basic info)
        if (stepNumber === 1) {
            const requiredFields = currentStep.querySelectorAll('input[required], select[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                    
                    // Add error message
                    let errorMsg = field.parentNode.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.style.color = '#ef4444';
                        errorMsg.style.fontSize = '12px';
                        errorMsg.style.marginTop = '4px';
                        field.parentNode.appendChild(errorMsg);
                    }
                    errorMsg.textContent = this.t('common:field_required');
                } else {
                    field.classList.remove('error');
                    const errorMsg = field.parentNode.querySelector('.error-message');
                    if (errorMsg) {
                        errorMsg.remove();
                    }
                }
            });
            
            return isValid;
        }
        
        // For other steps, just allow progression
        return true;
    }

    validateAllRequiredFields() {
        const form = document.getElementById('add-member-form');
        if (!form) return false;
        
        const requiredFields = form.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        // Clear all previous errors
        form.querySelectorAll('.error-message').forEach(msg => msg.remove());
        form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                
                // Add error message
                let errorMsg = field.parentNode.querySelector('.error-message');
                if (!errorMsg) {
                    errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.style.color = '#ef4444';
                    errorMsg.style.fontSize = '12px';
                    errorMsg.style.marginTop = '4px';
                    field.parentNode.appendChild(errorMsg);
                }
                errorMsg.textContent = this.t('common:field_required');
                
                // Scroll to first error
                if (isValid === false) {
                    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
        
        return isValid;
    }

    setupFileUploadHandlers() {
        const fileInputs = document.querySelectorAll('.file-input');
        
        fileInputs.forEach(input => {
            const wrapper = input.closest('.file-upload-wrapper');
            const display = wrapper.querySelector('.file-upload-display');
            const preview = wrapper.querySelector('.file-preview');
            const fileName = preview?.querySelector('.file-name');
            
            // File input change event
            input.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileSelection(file, wrapper, display, preview, fileName);
                }
            });
            
            // Drag and drop events
            display.addEventListener('dragover', (e) => {
                e.preventDefault();
                wrapper.classList.add('dragover');
            });
            
            display.addEventListener('dragleave', (e) => {
                e.preventDefault();
                wrapper.classList.remove('dragover');
            });
            
            display.addEventListener('drop', (e) => {
                e.preventDefault();
                wrapper.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    input.files = files;
                    this.handleFileSelection(files[0], wrapper, display, preview, fileName);
                }
            });
            
            // Click to trigger file input
            display.addEventListener('click', () => {
                input.click();
            });
        });
    }
    
    handleFileSelection(file, wrapper, display, preview, fileName) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            this.showErrorMessage(`File ${file.name} is too large. Maximum size is 5MB.`);
            return;
        }
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            this.showErrorMessage(`File ${file.name} is not a supported format. Please use PDF, JPG, PNG, or DOC files.`);
            return;
        }
        
        // Update UI
        if (fileName) {
            fileName.textContent = file.name;
        }
        
        wrapper.classList.add('has-file');
        wrapper.classList.remove('error');
        wrapper.classList.add('success');
    }
    
    removeFile(inputId) {
        const input = document.getElementById(inputId);
        const wrapper = input.closest('.file-upload-wrapper');
        const display = wrapper.querySelector('.file-upload-display');
        const preview = wrapper.querySelector('.file-preview');
        
        // Clear the file input
        input.value = '';
        
        // Reset UI
        wrapper.classList.remove('has-file', 'error', 'success');
        if (preview) {
            preview.style.display = 'none';
        }
    }

    async addOfflineMember() {
        console.log('👤 Adding offline member...');
        
        // Validate all required fields before submission
        if (!this.validateAllRequiredFields()) {
            this.showErrorMessage('Please fill in all required fields.');
            return;
        }
        
        const form = document.getElementById('add-member-form');
        const formData = new FormData(form);
        
        // Handle file uploads
        const documents = {};
        const fileInputs = form.querySelectorAll('input[type="file"]');
        
        for (const fileInput of fileInputs) {
            const file = fileInput.files[0];
            if (file) {
                // Validate file size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    this.showErrorMessage(`File ${file.name} is too large. Maximum size is 5MB.`);
                    return;
                }
                
                // Validate file type
                const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                if (!allowedTypes.includes(file.type)) {
                    this.showErrorMessage(`File ${file.name} is not a supported format. Please use PDF, JPG, PNG, or DOC files.`);
                    return;
                }
                
                documents[fileInput.name] = {
                    name: file.name,
                    type: file.type,
                    size: file.size
                };
            }
        }
        
        const memberData = {
            // Basic Information
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email'),
            phone: formData.get('phone') || null,
            date_of_birth: formData.get('date_of_birth') || null,
            bio: formData.get('bio') || null,
            
            // Employment Information
            role: formData.get('role'),
            job_title: formData.get('job_title') || null,
            department: formData.get('department') || null,
            employment_type: formData.get('employment_type') || null,
            employment_start_date: formData.get('employment_start_date') || null,
            work_location: formData.get('work_location') || null,
            salary: formData.get('salary') ? parseFloat(formData.get('salary')) : null,
            currency: formData.get('currency') || 'EUR',
            
            // Banking Information
            iban: formData.get('iban') || null,
            bank_name: formData.get('bank_name') || null,
            
            // Documents and Additional Information
            documents: Object.keys(documents).length > 0 ? documents : null,
            emergency_contact_name: formData.get('emergency_contact_name') || null,
            emergency_contact_phone: formData.get('emergency_contact_phone') || null,
            address_line1: formData.get('address_line1') || null,
            address_line2: formData.get('address_line2') || null,
            city: formData.get('city') || null,
            state_province: formData.get('state_province') || null,
            postal_code: formData.get('postal_code') || null,
            country: formData.get('country') || null,
            
            organization_id: this.currentUser.organization_id
        };

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/organizations/add-offline-member', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(memberData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showSuccessMessage('Offline member added successfully!');
                this.closeAddMemberModal();
                
                // Refresh the members list
                await this.loadOrganizationInfo();
            } else {
                throw new Error(result.error || 'Failed to add offline member');
            }
        } catch (error) {
            console.error('❌ Error adding offline member:', error);
            this.showErrorMessage(error.message || 'Failed to add offline member. Please try again.');
        } finally {
            // Reset button state
            btnText.style.display = 'inline-flex';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    goToStep(stepNumber) {
        console.log(`📋 Going to step ${stepNumber}`);
        
        // Hide all step contents
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active/completed classes from all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });

        // Show current step content
        document.getElementById(`step-${stepNumber}`).classList.add('active');

        // Update step indicators
        for (let i = 1; i <= 3; i++) {
            const stepElement = document.querySelector(`[data-step="${i}"]`);
            if (i < stepNumber) {
                stepElement.classList.add('completed');
            } else if (i === stepNumber) {
                stepElement.classList.add('active');
            }
        }

        // Update button visibility
        this.updateStepButtons(stepNumber);
    }

    updateStepButtons(stepNumber) {
        const nextBtn = document.getElementById('next-step-btn');
        const prevBtn = document.getElementById('prev-step-btn');
        const sendBtn = document.getElementById('send-invite-btn');
        const generateBtn = document.getElementById('generate-invite-btn');

        // Hide all action buttons
        nextBtn.style.display = 'none';
        prevBtn.style.display = 'none';
        sendBtn.style.display = 'none';
        generateBtn.style.display = 'none';

        if (stepNumber === 1) {
            nextBtn.style.display = 'inline-flex';
        } else if (stepNumber === 2) {
            prevBtn.style.display = 'inline-flex';
            if (this.selectedMethod === 'email') {
                sendBtn.style.display = 'inline-flex';
            } else {
                generateBtn.style.display = 'inline-flex';
            }
        }
    }

    selectInviteMethod(method) {
        console.log(`📧 Selecting invite method: ${method}`);
        this.selectedMethod = method;
        
        // Remove selected class from all options
        document.querySelectorAll('.method-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selected class to chosen option
        document.querySelector(`[data-method="${method}"]`).classList.add('selected');

        // Enable next button
        document.getElementById('next-step-btn').disabled = false;

        // Update step 2 content based on method
        this.updateStep2Content(method);
    }

    updateStep2Content(method) {
        const emailForm = document.getElementById('email-invite-form');
        const linkForm = document.getElementById('link-invite-form');
        const step2Title = document.getElementById('step-2-title');
        const step2Description = document.getElementById('step-2-description');
        
        if (method === 'email') {
            emailForm.style.display = 'block';
            linkForm.style.display = 'none';
            step2Title.textContent = 'Configure Email Invitation';
            step2Description.textContent = 'Enter the details for the person you want to invite';
        } else {
            emailForm.style.display = 'none';
            linkForm.style.display = 'block';
            step2Title.textContent = 'Configure Invite Link';
            step2Description.textContent = 'Set up the parameters for your invite link';
        }
    }

    resetInviteForm() {
        console.log('🔄 Resetting invite form');
        
        // Reset email form
        const emailForm = document.getElementById('email-invite-form-element');
        if (emailForm) {
            emailForm.reset();
        }
        
        // Reset link form
        const linkForm = document.getElementById('link-invite-form-element');
        if (linkForm) {
            linkForm.reset();
            document.getElementById('invite-expiry').value = '7';
        }
        
        // Hide result sections
        document.getElementById('email-success').style.display = 'none';
        document.getElementById('link-success').style.display = 'none';
        
        // Reset method selection
        this.selectedMethod = null;
        document.querySelectorAll('.method-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Reset step indicators
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        document.querySelector('.step[data-step="1"]').classList.add('active');

        // Disable next button
        document.getElementById('next-step-btn').disabled = true;
        
        // Reset button states
        const sendBtn = document.getElementById('send-invite-btn');
        const generateBtn = document.getElementById('generate-invite-btn');
        
        if (sendBtn) {
            sendBtn.classList.remove('loading');
            sendBtn.disabled = false;
            sendBtn.querySelector('.btn-text').style.display = 'inline';
            sendBtn.querySelector('.btn-loading').style.display = 'none';
        }
        
        if (generateBtn) {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
            generateBtn.querySelector('.btn-text').style.display = 'inline';
            generateBtn.querySelector('.btn-loading').style.display = 'none';
        }
    }

    async sendEmailInvitation() {
        try {
            console.log('📧 Sending email invitation...');
            console.log('📧 Button clicked, starting invitation process...');
            
            const sendBtn = document.getElementById('send-invite-btn');
            sendBtn.classList.add('loading');
            sendBtn.disabled = true;
            sendBtn.querySelector('.btn-text').style.display = 'none';
            sendBtn.querySelector('.btn-loading').style.display = 'flex';

            const formData = new FormData(document.getElementById('email-invite-form-element'));
            const inviteData = {
                email: formData.get('email'),
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                role: formData.get('role'),
                message: formData.get('message')
            };
            
            console.log('📧 Form data collected:', inviteData);
            console.log('📧 Making API request to /api/auth/generate-invite...');

            const response = await fetch('/api/auth/generate-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(inviteData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.details ? `${errorData.error}: ${errorData.details}` : errorData.error || 'Failed to send invitation';
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('✅ Email invitation sent:', result);

            // Display success result
            document.getElementById('result-recipient').textContent = `${inviteData.first_name} ${inviteData.last_name} (${inviteData.email})`;
            document.getElementById('result-role').textContent = this.formatRole(inviteData.role);
            document.getElementById('result-expires').textContent = this.formatDate(result.invite.expires_at);
            
            // Show step 3 with email success
            document.getElementById('email-success').style.display = 'block';
            document.getElementById('link-success').style.display = 'none';
            this.goToStep(3);

            // Show success message
            this.showSuccessMessage(this.t('organizations:invitation_sent'));

        } catch (error) {
            console.error('❌ Error sending email invitation:', error);
            this.showErrorMessage(`Failed to send invitation: ${error.message}`);
        } finally {
            const sendBtn = document.getElementById('send-invite-btn');
            sendBtn.classList.remove('loading');
            sendBtn.disabled = false;
            sendBtn.querySelector('.btn-text').style.display = 'inline';
            sendBtn.querySelector('.btn-loading').style.display = 'none';
        }
    }

    async generateInviteLink() {
        try {
            console.log('🔗 Generating invite link...');
            
            const generateBtn = document.getElementById('generate-invite-btn');
            generateBtn.classList.add('loading');
            generateBtn.disabled = true;
            generateBtn.querySelector('.btn-text').style.display = 'none';
            generateBtn.querySelector('.btn-loading').style.display = 'flex';

            const formData = new FormData(document.getElementById('link-invite-form-element'));
            const inviteData = {
                role: formData.get('role'),
                expiry_days: parseInt(formData.get('expiry_days'))
            };

            const response = await fetch('/api/auth/generate-invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(inviteData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate invite link');
            }

            const result = await response.json();
            console.log('✅ Invite link generated:', result);

            // Display the invite link
            document.getElementById('invite-link').value = result.invite_link;
            document.getElementById('link-result-role').textContent = this.formatRole(inviteData.role);
            document.getElementById('link-result-expires').textContent = this.formatDate(result.expires_at);
            
            // Show step 3 with link success
            document.getElementById('link-success').style.display = 'block';
            document.getElementById('email-success').style.display = 'none';
            this.goToStep(3);

            // Show success message
            this.showSuccessMessage(this.t('organizations:invite_link_generated'));

        } catch (error) {
            console.error('❌ Error generating invite link:', error);
            this.showErrorMessage(`Failed to generate invite link: ${error.message}`);
        } finally {
            const generateBtn = document.getElementById('generate-invite-btn');
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
            generateBtn.querySelector('.btn-text').style.display = 'inline';
            generateBtn.querySelector('.btn-loading').style.display = 'none';
        }
    }

    async copyInviteLink() {
        try {
            const inviteLink = document.getElementById('invite-link');
            await navigator.clipboard.writeText(inviteLink.value);
            
            const copyBtn = document.getElementById('copy-invite-link');
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            
            this.showSuccessMessage(this.t('organizations:link_copied'));
            
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

// Global function for removing files (accessible from HTML onclick)
function removeFile(inputId) {
    if (window.organizationsManager) {
        window.organizationsManager.removeFile(inputId);
    }
}