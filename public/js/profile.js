// Profile Page JavaScript
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('👤 Initializing Profile Manager...');
        
        try {
            // Initialize shared functionality
            if (window.sharedManager) {
                await window.sharedManager.init();
                this.currentUser = window.sharedManager.currentUser;
            }

            // Load profile information
            await this.loadProfileInfo();
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing Profile Manager:', error);
            this.showError('Failed to initialize profile page');
        }
    }

    async loadProfileInfo() {
        console.log('📡 Loading profile information...');
        
        try {
            this.showLoading();
            
            // Check if user is authenticated
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Please log in to view profile information');
            }
            
            // Get user profile
            const profileResponse = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!profileResponse.ok) {
                if (profileResponse.status === 401) {
                    throw new Error('Please log in to view profile information');
                }
                throw new Error('Failed to fetch user profile');
            }

            const profileData = await profileResponse.json();
            this.currentUser = profileData.profile || profileData; // Handle both nested and direct structure
            
            console.log('👤 User profile data:', profileData);
            console.log('👤 Current user:', this.currentUser);

            // Display the profile data
            this.displayProfileInfo();
            
        } catch (error) {
            console.error('❌ Error loading profile info:', error);
            this.showError(`Failed to load profile information: ${error.message}`);
        }
    }

    displayProfileInfo() {
        console.log('📊 Displaying profile information...');
        
        const user = this.currentUser;
        if (!user) return;

        // Set body data attribute for role-based styling
        document.body.setAttribute('data-user-role', user.role || 'employee');

        // Update profile header
        this.updateProfileHeader(user);
        
        // Update profile details
        this.updateProfileDetails(user);
        
        // Show/hide sections based on role
        this.updateSectionVisibility(user);

        // Hide loading, show content
        this.hideLoading();
        document.getElementById('profile-content').style.display = 'block';
    }

    updateProfileHeader(user) {
        // Update avatar with initials
        const avatar = document.getElementById('profile-avatar');
        const initials = this.getInitials(user.first_name, user.last_name);
        avatar.innerHTML = initials;

        // Update profile name and email
        document.getElementById('profile-name').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('profile-email').textContent = user.email;
        
        // Update role badge
        const roleElement = document.getElementById('profile-role');
        roleElement.textContent = this.formatRole(user.role);
        roleElement.className = `profile-role ${user.role}`;

        // Update status
        const statusElement = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        if (user.is_active) {
            statusElement.className = 'status-indicator active';
            statusText.textContent = 'Active';
        } else {
            statusElement.className = 'status-indicator inactive';
            statusText.textContent = 'Inactive';
        }

        // Show edit button for admins
        if (user.role === 'admin' || user.role === 'super_admin') {
            document.getElementById('edit-profile-btn').style.display = 'inline-flex';
        }
    }

    updateProfileDetails(user) {
        // Personal Information
        document.getElementById('profile-first-name').textContent = user.first_name || 'Not provided';
        document.getElementById('profile-last-name').textContent = user.last_name || 'Not provided';
        document.getElementById('profile-email-address').textContent = user.email || 'Not provided';
        document.getElementById('profile-role-detail').textContent = this.formatRole(user.role);

        // Account Information
        document.getElementById('profile-status').textContent = user.is_active ? 'Active' : 'Inactive';
        document.getElementById('profile-created').textContent = this.formatDate(user.created_at);
        document.getElementById('profile-updated').textContent = this.formatDate(user.updated_at);
        document.getElementById('profile-id').textContent = user.id || 'Not available';

        // Organization Information (if applicable)
        if (user.organization_id) {
            document.getElementById('profile-organization').textContent = 'Organization Name'; // Could fetch org name
            document.getElementById('profile-team').textContent = user.team_id ? 'Team Name' : 'No team assigned';
        }

        // Administrative Information (for admins)
        if (user.role === 'admin' || user.role === 'super_admin') {
            document.getElementById('profile-role-id').textContent = user.role_id || 'Not available';
            document.getElementById('profile-org-id').textContent = user.organization_id || 'Not available';
        }
    }

    updateSectionVisibility(user) {
        // Show organization section if user has organization
        const orgSection = document.getElementById('organization-section');
        if (user.organization_id) {
            orgSection.style.display = 'block';
        } else {
            orgSection.style.display = 'none';
        }

        // Show admin section for admins
        const adminSection = document.getElementById('admin-section');
        if (user.role === 'admin' || user.role === 'super_admin') {
            adminSection.style.display = 'block';
        } else {
            adminSection.style.display = 'none';
        }
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setupEventListeners() {
        // Edit profile button
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.editProfile();
            });
        }

        // Retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadProfileInfo();
            });
        }
    }

    editProfile() {
        // TODO: Implement edit profile functionality
        alert('Edit profile functionality coming soon!');
    }

    showLoading() {
        document.getElementById('loading-state').style.display = 'flex';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('profile-content').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('profile-content').style.display = 'none';
        document.getElementById('error-state').style.display = 'flex';
        document.getElementById('error-message').textContent = message;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('👤 Profile page loaded');
    window.profileManager = new ProfileManager();
});

// Global function for retry
function loadProfileInfo() {
    if (window.profileManager) {
        window.profileManager.loadProfileInfo();
    }
} 