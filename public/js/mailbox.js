// Mailbox Management System
console.log('📬 MAILBOX.JS FILE LOADED!');

class MailboxManager {
    constructor() {
        console.log('🔧 MailboxManager: Constructor called');
        this.currentTab = 'invitations';
        this.invitations = [];
        this.notifications = [];
        this.init();
    }

    async init() {
        console.log('🚀 MailboxManager: Initializing...');
        try {
            this.setupEventListeners();
            await this.checkForInvitations();
            console.log('✅ MailboxManager: Initialized successfully');
        } catch (error) {
            console.error('❌ MailboxManager: Initialization failed:', error);
        }
    }

    setupEventListeners() {
        console.log('🎯 Setting up mailbox event listeners...');
        
        // Mailbox navigation click
        const mailboxNav = document.getElementById('mailbox-nav');
        if (mailboxNav) {
            console.log('✅ Found mailbox nav element');
            mailboxNav.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('📬 Mailbox nav clicked');
                this.openMailbox();
            });
        } else {
            console.error('❌ Mailbox nav element not found!');
        }

        // Modal close button
        const closeBtn = document.getElementById('mailbox-close-btn');
        if (closeBtn) {
            console.log('✅ Found close button');
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('❌ Mailbox close clicked - Event:', e);
                this.closeMailbox();
            });
            
            // Also add mousedown event as backup
            closeBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Mailbox close mousedown - Event:', e);
                this.closeMailbox();
            });
        } else {
            console.error('❌ Close button not found!');
        }

        // Modal backdrop click
        const modal = document.getElementById('mailbox-modal');
        if (modal) {
            console.log('✅ Found mailbox modal');
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('🖱️ Mailbox backdrop clicked');
                    this.closeMailbox();
                }
            });
        } else {
            console.error('❌ Mailbox modal not found!');
        }

        // Tab switching
        const tabs = document.querySelectorAll('.mailbox-tab');
        console.log('📑 Found tabs:', tabs.length);
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                console.log('📑 Switching to tab:', tabName);
                this.switchTab(tabName);
            });
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMailboxOpen()) {
                this.closeMailbox();
            }
        });

        // Event delegation for invitation buttons
        document.addEventListener('click', (e) => {
            console.log('🔍 Click event detected:', e.target);
            console.log('🔍 Target classList:', e.target.classList);
            console.log('🔍 Closest button:', e.target.closest('.invitation-btn'));
            
            if (e.target.closest('.invitation-btn')) {
                const button = e.target.closest('.invitation-btn');
                const invitationId = button.getAttribute('data-invitation-id');
                const action = button.getAttribute('data-action');
                
                console.log('🎯 Button found!');
                console.log('🎯 Invitation ID:', invitationId);
                console.log('🎯 Action:', action);
                
                if (invitationId && action) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🎯 Invitation button clicked: ${action} for invitation ${invitationId}`);
                    
                    if (action === 'accept') {
                        this.acceptInvitation(invitationId);
                    } else if (action === 'decline') {
                        this.declineInvitation(invitationId);
                    }
                } else {
                    console.error('❌ Missing invitation ID or action:', { invitationId, action });
                }
            }
        });

        console.log('✅ Mailbox event listeners setup complete');
    }

    async checkForInvitations() {
        console.log('🔍 Checking for invitations...');
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('❌ No token found, skipping invitation check');
                return;
            }

            const response = await fetch('/api/mailbox/invitations', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📬 Invitations data:', data);
                
                const pendingCount = data.invitations.filter(inv => 
                    inv.status === 'pending' && !this.isExpired(inv.expires_at)
                ).length;
                
                this.updateBadge(pendingCount);
                this.invitations = data.invitations;
            } else {
                console.log('❌ Failed to fetch invitations:', response.status);
            }
        } catch (error) {
            console.error('❌ Error checking invitations:', error);
        }
    }

    updateBadge(count) {
        console.log('🔢 Updating badge count:', count);
        const badge = document.getElementById('mailbox-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    isExpired(expiresAt) {
        return new Date(expiresAt) < new Date();
    }

    openMailbox() {
        console.log('📬 Opening mailbox...');
        const modal = document.getElementById('mailbox-modal');
        if (modal) {
            console.log('✅ Modal found, adding show class');
            modal.classList.add('show');
            
            // Force show the loading state immediately
            const loadingEl = document.getElementById('invitations-loading');
            const emptyEl = document.getElementById('invitations-empty');
            const listEl = document.getElementById('invitations-list');
            
            if (loadingEl) loadingEl.style.display = 'flex';
            if (emptyEl) emptyEl.style.display = 'none';
            if (listEl) listEl.style.display = 'none';
            
            // Force modal to be visible
            modal.style.display = 'flex';
            modal.style.zIndex = '99999';
            
            // Ensure modal content is visible
            const modalContent = modal.querySelector('.mailbox-modal-content');
            if (modalContent) {
                modalContent.style.zIndex = '100000';
                modalContent.style.position = 'relative';
            }
            
            // Load content
            this.loadInvitations();
            this.loadNotifications();
            
            // Fallback: If no content loads after 2 seconds, show empty state
            setTimeout(() => {
                const loadingEl = document.getElementById('invitations-loading');
                const emptyEl = document.getElementById('invitations-empty');
                if (loadingEl && loadingEl.style.display === 'flex') {
                    console.log('⚠️ Loading timeout, showing empty state');
                    loadingEl.style.display = 'none';
                    if (emptyEl) {
                        emptyEl.style.display = 'flex';
                        emptyEl.innerHTML = `
                            <i class="fas fa-inbox"></i>
                            <span>No invitations yet</span>
                            <small>When you receive invitations to join organizations, they will appear here.</small>
                        `;
                    }
                }
            }, 2000);
        } else {
            console.error('❌ Modal not found!');
        }
    }

    closeMailbox() {
        console.log('❌ Closing mailbox...');
        const modal = document.getElementById('mailbox-modal');
        if (modal) {
            console.log('✅ Modal found, removing show class and hiding');
            modal.classList.remove('show');
            modal.style.display = 'none';
            
            // Reset modal content visibility
            const modalContent = modal.querySelector('.mailbox-modal-content');
            if (modalContent) {
                modalContent.style.zIndex = '100000';
                modalContent.style.position = 'relative';
            }
            
            console.log('✅ Mailbox closed successfully');
        } else {
            console.error('❌ Modal not found for closing');
        }
    }

    isMailboxOpen() {
        const modal = document.getElementById('mailbox-modal');
        return modal && modal.classList.contains('show');
    }

    switchTab(tabName) {
        console.log('📑 Switching to tab:', tabName);
        this.currentTab = tabName;

        // Update tab buttons
        const tabs = document.querySelectorAll('.mailbox-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update tab content
        const tabContents = document.querySelectorAll('.mailbox-tab-content');
        tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Load content based on tab
        if (tabName === 'invitations') {
            this.loadInvitations();
        } else if (tabName === 'notifications') {
            this.loadNotifications();
        }
    }

    async loadInvitations() {
        console.log('📬 Loading invitations...');
        const loadingEl = document.getElementById('invitations-loading');
        const emptyEl = document.getElementById('invitations-empty');
        const listEl = document.getElementById('invitations-list');

        // Show loading
        if (loadingEl) loadingEl.style.display = 'flex';
        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.style.display = 'none';

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await fetch('/api/mailbox/invitations', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📬 Invitations loaded:', data);
                
                if (data.invitations && data.invitations.length > 0) {
                    this.renderInvitations(data.invitations);
                    if (loadingEl) loadingEl.style.display = 'none';
                    if (listEl) listEl.style.display = 'block';
                } else {
                    if (loadingEl) loadingEl.style.display = 'none';
                    if (emptyEl) {
                        emptyEl.style.display = 'flex';
                        emptyEl.innerHTML = `
                            <i class="fas fa-inbox"></i>
                            <span>No invitations yet</span>
                            <small>When you receive invitations to join organizations, they will appear here.</small>
                        `;
                    }
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading invitations:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (emptyEl) {
                emptyEl.style.display = 'flex';
                emptyEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error loading invitations</span>
                    <small>Please try again later.</small>
                `;
            }
        }
    }

    renderInvitations(invitations) {
        console.log('🎨 Rendering invitations:', invitations);
        const listEl = document.getElementById('invitations-list');
        if (!listEl) {
            console.error('❌ Invitations list element not found!');
            return;
        }
        
        console.log('🎨 List element found:', listEl);
        
        const invitationsHtml = invitations.map(invitation => {
            const statusClass = invitation.status === 'pending' ? 'pending' : 
                              invitation.status === 'expired' ? 'expired' : 
                              invitation.status === 'accepted' ? 'accepted' : 'declined';
            
            const statusText = invitation.status === 'pending' ? 'Pending' : 
                             invitation.status === 'expired' ? 'Expired' : 
                             invitation.status === 'accepted' ? 'Accepted' : 'Declined';
            
            const isExpired = this.isExpired(invitation.expires_at);
            const canAccept = invitation.status === 'pending' && !isExpired;
            
            return `
                <div class="invitation-item ${invitation.status}" data-invitation-id="${invitation.id}">
                    <div class="invitation-header">
                        <div class="invitation-info">
                            <div class="invitation-title">Invitation to join organization</div>
                            <div class="invitation-subtitle">From: ${invitation.created_by_name}</div>
                            <div class="invitation-organization">
                                <i class="fas fa-building"></i>
                                ${invitation.organization_name}
                            </div>
                        </div>
                        <div class="invitation-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="invitation-content">
                        ${invitation.message ? `<div class="invitation-message">${invitation.message}</div>` : ''}
                        <div class="invitation-details">
                            <div class="invitation-detail">
                                <i class="fas fa-envelope"></i>
                                <span>${invitation.email}</span>
                            </div>
                            <div class="invitation-detail">
                                <i class="fas fa-user-tag"></i>
                                <span>Role: ${invitation.role || 'Member'}</span>
                            </div>
                            <div class="invitation-detail">
                                <i class="fas fa-clock"></i>
                                <span>Expires: ${this.formatDate(invitation.expires_at)}</span>
                            </div>
                        </div>
                        ${canAccept ? `
                            <div class="invitation-actions">
                                <button class="invitation-btn accept" data-invitation-id="${invitation.id}" data-action="accept" onclick="console.log('Direct onclick: Accept ${invitation.id}')">
                                    <i class="fas fa-check"></i>
                                    Accept
                                </button>
                                <button class="invitation-btn decline" data-invitation-id="${invitation.id}" data-action="decline" onclick="console.log('Direct onclick: Decline ${invitation.id}')">
                                    <i class="fas fa-times"></i>
                                    Decline
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        listEl.innerHTML = invitationsHtml;
        console.log('🎨 Rendered HTML:', invitationsHtml);
        console.log('🎨 Buttons in DOM:', listEl.querySelectorAll('.invitation-btn').length);
    }

    async acceptInvitation(invitationId) {
        console.log('✅ Accepting invitation:', invitationId);
        await this.respondToInvitation(invitationId, 'accept');
    }

    async declineInvitation(invitationId) {
        console.log('❌ Declining invitation:', invitationId);
        await this.respondToInvitation(invitationId, 'decline');
    }

    async respondToInvitation(invitationId, action) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await fetch(`/api/mailbox/invitations/${invitationId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Invitation ${action} successful:`, data);
                
                // Show success message with custom text
                if (action === 'accept') {
                    this.showNotification('🎉 Invitation accepted! You have successfully joined the organization.', 'success');
                } else {
                    this.showNotification(`Invitation ${action}ed successfully!`, 'success');
                }
                
                // Reload invitations
                await this.loadInvitations();
                
                // Update badge count
                await this.checkForInvitations();
                
                // If accepted, redirect to dashboard after a short delay
                if (action === 'accept') {
                    setTimeout(() => {
                        this.showNotification('🔄 Redirecting to dashboard...', 'info');
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 1000);
                    }, 2000);
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to ${action} invitation`);
            }
        } catch (error) {
            console.error(`❌ Error ${action}ing invitation:`, error);
            this.showNotification(`Failed to ${action} invitation: ${error.message}`, 'error');
        }
    }

    async loadNotifications() {
        console.log('🔔 Loading notifications...');
        const loadingEl = document.getElementById('notifications-loading');
        const emptyEl = document.getElementById('notifications-empty');
        const listEl = document.getElementById('notifications-list');

        // Show loading
        if (loadingEl) loadingEl.style.display = 'flex';
        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.style.display = 'none';

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await fetch('/api/mailbox/notifications', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('🔔 Notifications loaded:', data);
                
                if (data.notifications && data.notifications.length > 0) {
                    this.renderNotifications(data.notifications);
                    if (loadingEl) loadingEl.style.display = 'none';
                    if (listEl) listEl.style.display = 'block';
                } else {
                    if (loadingEl) loadingEl.style.display = 'none';
                    if (emptyEl) {
                        emptyEl.style.display = 'flex';
                        emptyEl.innerHTML = `
                            <i class="fas fa-bell"></i>
                            <span>No notifications yet</span>
                            <small>System notifications will appear here when available.</small>
                        `;
                    }
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (emptyEl) {
                emptyEl.style.display = 'flex';
                emptyEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Error loading notifications</span>
                    <small>Please try again later.</small>
                `;
            }
        }
    }

    renderNotifications(notifications) {
        console.log('🎨 Rendering notifications:', notifications);
        const listEl = document.getElementById('notifications-list');
        if (!listEl) {
            console.error('❌ Notifications list element not found!');
            return;
        }
        
        const notificationsHtml = notifications.map(notification => {
            return `
                <div class="notification-item ${notification.read ? '' : 'unread'}" data-notification-id="${notification.id}">
                    <div class="notification-header">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-time">${this.formatDate(notification.created_at)}</div>
                    </div>
                    <div class="notification-content">${notification.message}</div>
                </div>
            `;
        }).join('');

        listEl.innerHTML = notificationsHtml;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`;
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    }

    showNotification(message, type = 'info') {
        console.log('📢 Showing notification:', message, type);
        
        const notification = document.createElement('div');
        notification.className = `mailbox-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#667eea'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10001;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize mailbox when DOM is loaded
let mailboxManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM LOADED - Creating Mailbox Manager!');
    try {
        mailboxManager = new MailboxManager();
        console.log('✅ MailboxManager created successfully');
        
        // Debug: Add global function to test mailbox
        window.testMailbox = () => {
            console.log('🧪 Testing mailbox...');
            if (mailboxManager) {
                mailboxManager.openMailbox();
            } else {
                console.error('❌ MailboxManager not found');
            }
        };
        
        // Debug: Add global function to test close
        window.testCloseMailbox = () => {
            console.log('🧪 Testing mailbox close...');
            if (mailboxManager) {
                mailboxManager.closeMailbox();
            } else {
                console.error('❌ MailboxManager not found');
            }
        };
        
        // Debug: Add global function to check close button
        window.checkCloseButton = () => {
            console.log('🔍 Checking close button...');
            const closeBtn = document.getElementById('mailbox-close-btn');
            if (closeBtn) {
                console.log('✅ Close button found');
                console.log('- Visible:', closeBtn.offsetParent !== null);
                console.log('- Clickable:', !closeBtn.disabled);
                console.log('- Z-index:', window.getComputedStyle(closeBtn).zIndex);
                console.log('- Position:', closeBtn.getBoundingClientRect());
                
                // Test if it's clickable
                setTimeout(() => {
                    closeBtn.style.border = '';
                }, 2000);
            } else {
                console.error('❌ Close button not found');
            }
        };
        
        // Debug: Log mailbox elements
        console.log('🔍 Mailbox elements check:');
        console.log('- Modal:', !!document.getElementById('mailbox-modal'));
        console.log('- Nav:', !!document.getElementById('mailbox-nav'));
        console.log('- Loading:', !!document.getElementById('invitations-loading'));
        console.log('- Empty:', !!document.getElementById('invitations-empty'));
        console.log('- List:', !!document.getElementById('invitations-list'));
        
    } catch (error) {
        console.error('❌ Error creating MailboxManager:', error);
    }
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('📋 DOM still loading, waiting...');
} else {
    console.log('🚀 DOM already loaded - Creating Mailbox Manager!');
    try {
        mailboxManager = new MailboxManager();
        console.log('✅ MailboxManager created successfully (DOM already loaded)');
        
        // Debug: Add global function to test mailbox
        window.testMailbox = () => {
            console.log('🧪 Testing mailbox...');
            if (mailboxManager) {
                mailboxManager.openMailbox();
            } else {
                console.error('❌ MailboxManager not found');
            }
        };
        
        // Debug: Log mailbox elements
        console.log('🔍 Mailbox elements check:');
        console.log('- Modal:', !!document.getElementById('mailbox-modal'));
        console.log('- Nav:', !!document.getElementById('mailbox-nav'));
        console.log('- Loading:', !!document.getElementById('invitations-loading'));
        console.log('- Empty:', !!document.getElementById('invitations-empty'));
        console.log('- List:', !!document.getElementById('invitations-list'));
        
    } catch (error) {
        console.error('❌ Error creating MailboxManager (DOM already loaded):', error);
    }
} 