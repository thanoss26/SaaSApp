// Subscription Management Page JavaScript

// Global variables
let currentSubscription = null;
let availablePlans = [];
let isAnnualBilling = false;
let isLoading = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing subscription management page...');
    
    // Initialize i18n
    initializeI18n();
    
    // Load current subscription status
    loadCurrentSubscription();
    
    // Load available plans
    loadSubscriptionPlans();
    
    // Load plan limits
    loadPlanLimits();
    
    // Setup billing toggle
    setupBillingToggle();
    
    // Setup event listeners
    setupEventListeners();
});

// Initialize internationalization
async function initializeI18n() {
    try {
        // Create a simple i18next fallback if the library is not available
        if (typeof i18next === 'undefined') {
            console.log('⚠️ i18next not available, using fallback translations');
            window.i18next = {
                t: function(key) {
                    const translations = {
                        'subscriptions.title': 'Subscription Management',
                        'subscriptions.description': 'Manage your subscription plans and billing preferences',
                        'subscriptions.current_subscription': 'Current Subscription',
                        'subscriptions.available_plans': 'Available Plans',
                        'subscriptions.subscription_actions': 'Subscription Actions',
                        'subscriptions.billing_cycle': 'Billing Cycle:',
                        'subscriptions.monthly': 'Monthly',
                        'subscriptions.annual': 'Annual',
                        'subscriptions.save_up_to': 'Save up to 17%',
                        'subscriptions.manage_billing': 'Manage Billing',
                        'subscriptions.manage_billing_desc': 'Update payment methods and view billing history',
                        'subscriptions.download_invoices': 'Download Invoices',
                        'subscriptions.download_invoices_desc': 'Access and download your billing invoices',
                        'subscriptions.get_support': 'Get Support',
                        'subscriptions.get_support_desc': 'Contact our support team for subscription help',
                        'subscriptions.open_billing_portal': 'Open Billing Portal',
                        'subscriptions.download_invoices_btn': 'Download Invoices',
                        'subscriptions.contact_support': 'Contact Support',
                        'subscriptions.subscribe_to_plan': 'Subscribe to Plan',
                        'subscriptions.loading_subscription': 'Loading subscription status...',
                        'subscriptions.loading_plans': 'Loading subscription plans...',
                        'subscriptions.processing': 'Processing...',
                        'subscriptions.no_subscription': 'No Active Subscription',
                        'subscriptions.no_subscription_desc': 'You don\'t have an active subscription. Choose a plan below to get started.',
                        'subscriptions.subscription_active': 'Active Subscription',
                        'subscriptions.plan_name': 'Plan',
                        'subscriptions.status': 'Status',
                        'subscriptions.next_billing': 'Next Billing',
                        'subscriptions.amount': 'Amount',
                        'subscriptions.cancel_subscription': 'Cancel Subscription',
                        'subscriptions.upgrade_plan': 'Upgrade Plan',
                        'subscriptions.downgrade_plan': 'Downgrade Plan',
                        'subscriptions.change_plan': 'Change Plan',
                        'subscriptions.subscribe': 'Subscribe',
                        'subscriptions.current_plan': 'Current Plan',
                        'subscriptions.features': 'Features',
                        'subscriptions.unlimited_employees': 'Unlimited Employees',
                        'subscriptions.advanced_analytics': 'Advanced Analytics',
                        'subscriptions.priority_support': 'Priority Support',
                        'subscriptions.custom_integrations': 'Custom Integrations',
                        'subscriptions.api_access': 'API Access',
                        'subscriptions.white_label': 'White Label',
                        'subscriptions.dedicated_manager': 'Dedicated Account Manager',
                        'subscriptions.success_message': 'Operation completed successfully',
                        'subscriptions.error_message': 'An error occurred. Please try again.',
                        'subscriptions.confirm_cancel': 'Are you sure you want to cancel your subscription?',
                        'subscriptions.confirm_change': 'Are you sure you want to change your plan?'
                    };
                    return translations[key] || key;
                }
            };
        }
        
        console.log('✅ i18n initialized successfully');
        updatePageTranslations();
        
    } catch (error) {
        console.error('❌ Failed to initialize i18n:', error);
        // Create fallback i18next object
        window.i18next = {
            t: function(key) {
                return key; // Return the key as fallback
            }
        };
    }
}

// Update page translations
function updatePageTranslations() {
    const elements = {
        '.page-title': 'subscriptions.title',
        '.page-description': 'subscriptions.description',
        '.subscription-status-section .section-title': 'subscriptions.current_subscription',
        '.plans-section .section-title': 'subscriptions.available_plans',
        '.actions-section .section-title': 'subscriptions.subscription_actions',
        '.billing-label': 'subscriptions.billing_cycle',
        '#monthlyOption': 'subscriptions.monthly',
        '#annualOption': 'subscriptions.annual',
        '.savings-badge': 'subscriptions.save_up_to'
    };
    
    Object.entries(elements).forEach(([selector, key]) => {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = i18next.t(key);
        }
    });
}

// Setup billing toggle functionality
function setupBillingToggle() {
    const toggle = document.getElementById('billingToggle');
    const monthlyOption = document.getElementById('monthlyOption');
    const annualOption = document.getElementById('annualOption');
    
    if (toggle) {
        toggle.addEventListener('change', function() {
            isAnnualBilling = this.checked;
            updateBillingDisplay();
            updatePlansDisplay();
        });
    }
}

// Update billing display
function updateBillingDisplay() {
    const monthlyOption = document.getElementById('monthlyOption');
    const annualOption = document.getElementById('annualOption');
    
    if (isAnnualBilling) {
        monthlyOption.style.opacity = '0.5';
        annualOption.style.opacity = '1';
        annualOption.style.fontWeight = '600';
        monthlyOption.style.fontWeight = '400';
    } else {
        monthlyOption.style.opacity = '1';
        annualOption.style.opacity = '0.5';
        monthlyOption.style.fontWeight = '600';
        annualOption.style.fontWeight = '400';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Modal close functionality
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// Load current subscription status
async function loadCurrentSubscription() {
    try {
        console.log('📋 Loading current subscription...');
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNoSubscription();
            return;
        }
        
        const response = await fetch('/api/subscriptions/current', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentSubscription = data.subscription;
            displayCurrentSubscription();
        } else {
            showNoSubscription();
        }
        
    } catch (error) {
        console.error('❌ Error loading current subscription:', error);
        showNoSubscription();
    }
}

// Display current subscription
function displayCurrentSubscription() {
    const container = document.getElementById('currentSubscription');
    
    if (!container) {
        console.error('❌ Current subscription container not found');
        return;
    }
    
    if (!currentSubscription) {
        showNoSubscription();
        return;
    }
    
    const subscriptionHtml = `
        <div class="current-subscription">
            <h3><i class="fas fa-check-circle"></i> ${i18next.t('subscriptions.subscription_active')}</h3>
            <div class="subscription-info">
                <div class="subscription-detail">
                    <div class="detail-label">${i18next.t('subscriptions.plan_name')}</div>
                    <div class="detail-value">${currentSubscription.plan_name || 'Unknown'}</div>
                </div>
                <div class="subscription-detail">
                    <div class="detail-label">${i18next.t('subscriptions.status')}</div>
                    <div class="detail-value">${currentSubscription.status || 'Active'}</div>
                </div>
                <div class="subscription-detail">
                    <div class="detail-label">${i18next.t('subscriptions.next_billing')}</div>
                    <div class="detail-value">${formatDate(currentSubscription.next_billing_date)}</div>
                </div>
                <div class="subscription-detail">
                    <div class="detail-label">${i18next.t('subscriptions.amount')}</div>
                    <div class="detail-value">€${currentSubscription.amount || '0'}</div>
                </div>
            </div>
            <div class="subscription-actions">
                <button class="btn btn-outline" onclick="changePlan()">
                    <i class="fas fa-exchange-alt"></i>
                    ${i18next.t('subscriptions.change_plan')}
                </button>
                <button class="btn btn-outline" onclick="cancelSubscription()">
                    <i class="fas fa-times"></i>
                    ${i18next.t('subscriptions.cancel_subscription')}
                </button>
            </div>
        </div>
    `;
    
    if (container) {
        container.innerHTML = subscriptionHtml;
    }
}

// Show no subscription message
function showNoSubscription() {
    const container = document.getElementById('currentSubscription');
    
    if (container) {
        const noSubscriptionHtml = `
            <div class="current-subscription no-subscription">
                <h3><i class="fas fa-info-circle"></i> ${i18next.t('subscriptions.no_subscription')}</h3>
                <p>${i18next.t('subscriptions.no_subscription_desc')}</p>
            </div>
        `;
        
        container.innerHTML = noSubscriptionHtml;
    }
}

// Load subscription plans
async function loadSubscriptionPlans() {
    try {
        console.log('📋 Loading subscription plans...');
        
        const response = await fetch('/api/subscriptions/plans');
        
        if (response.ok) {
            const data = await response.json();
            availablePlans = data.plans;
            updatePlansDisplay();
        } else {
            console.error('❌ Failed to load plans:', response.status);
            showPlansError();
        }
        
    } catch (error) {
        console.error('❌ Error loading plans:', error);
        showPlansError();
    }
}

// Update plans display
function updatePlansDisplay() {
    const container = document.getElementById('plans-grid');
    
    if (!container) {
        console.error('❌ Plans grid container not found');
        return;
    }
    
    if (!availablePlans || availablePlans.length === 0) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No plans available</span>
            </div>
        `;
        return;
    }
    
    const plansHtml = availablePlans.map((plan, index) => {
        const isCurrentPlan = currentSubscription && currentSubscription.plan_id === plan.id;
        const isFeatured = plan.id === 'professional';
        const pricing = isAnnualBilling ? plan.annual : plan.monthly;
        
        return `
            <div class="plan-card ${isFeatured ? 'featured' : ''} ${isCurrentPlan ? 'current' : ''}">
                ${isCurrentPlan ? '<div class="plan-badge">Current</div>' : ''}
                <div class="plan-header">
                    <h3 class="plan-name">${plan.name}</h3>
                    <p class="plan-description">${getPlanDescription(plan.id)}</p>
                </div>
                <div class="plan-price">
                    <div class="price-amount">${pricing.amount}</div>
                    <span class="price-currency">€</span>
                    <div class="price-period">/${isAnnualBilling ? 'year' : 'month'}</div>
                </div>
                <ul class="plan-features">
                    ${getPlanFeatures(plan.id).map(feature => `
                        <li><i class="fas fa-check"></i> ${feature}</li>
                    `).join('')}
                </ul>
                <button class="plan-button ${isCurrentPlan ? 'secondary' : 'primary'}" 
                        onclick="handlePlanAction('${plan.id}', '${isCurrentPlan ? 'current' : 'subscribe'}')"
                        ${isCurrentPlan ? 'disabled' : ''}>
                    ${isCurrentPlan ? i18next.t('subscriptions.current_plan') : i18next.t('subscriptions.subscribe')}
                </button>
            </div>
        `;
    }).join('');
    
    if (container) {
        container.innerHTML = plansHtml;
    }
}

// Get plan description
function getPlanDescription(planId) {
    const descriptions = {
        'free': 'Perfect for individuals and small teams',
        'starter': 'Perfect for small teams getting started',
        'professional': 'Ideal for growing businesses',
        'enterprise': 'For large organizations with advanced needs'
    };
    return descriptions[planId] || 'Comprehensive plan for your needs';
}

// Get plan features
function getPlanFeatures(planId) {
    const features = {
        'free': [
            'Up to 3 employees',
            'Basic HR features',
            'Email support',
            'Core functionality'
        ],
        'starter': [
            'Up to 10 employees',
            'Basic analytics',
            'Email support',
            'Core HR features'
        ],
        'professional': [
            'Up to 100 employees',
            'Advanced analytics',
            'Priority support',
            'Custom integrations',
            'API access'
        ],
        'enterprise': [
            'Unlimited employees',
            'Advanced analytics',
            'Priority support',
            'Custom integrations',
            'API access',
            'White label',
            'Dedicated manager'
        ]
    };
    return features[planId] || ['Core features'];
}

// Handle plan action
function handlePlanAction(planId, action) {
    if (action === 'current') {
        showNotification('This is your current plan', 'info');
        return;
    }
    
    if (action === 'subscribe') {
        // Don't allow subscribing to free tier if already on it
        if (planId === 'free' && currentSubscription?.plan_name === 'free') {
            showNotification('You are already on the free plan', 'info');
            return;
        }
        showSubscriptionModal(planId);
    }
}

// Load user's plan limits
async function loadPlanLimits() {
    try {
        const response = await fetch('/api/subscriptions/limits/plan', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch plan limits');
        }
        
        const data = await response.json();
        if (data.success) {
            window.userPlanLimits = data.limits;
            updatePlanLimitsDisplay();
        }
    } catch (error) {
        console.error('❌ Error loading plan limits:', error);
    }
}

// Update plan limits display
function updatePlanLimitsDisplay() {
    const limits = window.userPlanLimits;
    if (!limits) return;
    
    // Update current plan display with limits
    const currentPlanElement = document.getElementById('current-subscription');
    if (currentPlanElement && currentSubscription) {
        const limitsHtml = `
            <div class="plan-limits">
                <h4>Your Plan Limits:</h4>
                <ul>
                    <li><i class="fas fa-users"></i> Employees: ${limits.max_employees === -1 ? 'Unlimited' : limits.max_employees}</li>
                    <li><i class="fas fa-building"></i> Organizations: ${limits.max_organizations === -1 ? 'Unlimited' : limits.max_organizations}</li>
                    <li><i class="fas fa-chart-bar"></i> Analytics: ${limits.has_analytics ? 'Available' : 'Not available'}</li>
                    <li><i class="fas fa-cog"></i> Advanced Features: ${limits.has_advanced_features ? 'Available' : 'Not available'}</li>
                    <li><i class="fas fa-code"></i> API Access: ${limits.has_api_access ? 'Available' : 'Not available'}</li>
                    <li><i class="fas fa-headset"></i> Priority Support: ${limits.has_priority_support ? 'Available' : 'Not available'}</li>
                </ul>
            </div>
        `;
        
        // Add limits to the current subscription display
        const existingLimits = currentPlanElement.querySelector('.plan-limits');
        if (existingLimits) {
            existingLimits.remove();
        }
        currentPlanElement.insertAdjacentHTML('beforeend', limitsHtml);
    }
}

// Check if user can add more employees
async function checkEmployeeLimit() {
    try {
        const response = await fetch('/api/subscriptions/limits/can-add-employee', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to check employee limit');
        }
        
        const data = await response.json();
        return data.success ? data.canAdd : false;
    } catch (error) {
        console.error('❌ Error checking employee limit:', error);
        return false;
    }
}

// Get current employee count
async function getEmployeeCount() {
    try {
        const response = await fetch('/api/subscriptions/limits/employee-count', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch employee count');
        }
        
        const data = await response.json();
        return data.success ? data : { count: 0, maxEmployees: 3 };
    } catch (error) {
        console.error('❌ Error fetching employee count:', error);
        return { count: 0, maxEmployees: 3 };
    }
}

// Show subscription modal
function showSubscriptionModal(planId) {
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return;
    
    const modal = document.getElementById('subscriptionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (!modal || !modalTitle || !modalContent) {
        console.error('❌ Modal elements not found');
        return;
    }
    
    const pricing = isAnnualBilling ? plan.annual : plan.monthly;
    
    modalTitle.textContent = `${i18next.t('subscriptions.subscribe_to_plan')}: ${plan.name}`;
    
    modalContent.innerHTML = `
        <div class="subscription-modal-content">
            <div class="plan-summary">
                <h4>${plan.name}</h4>
                <div class="plan-price-summary">
                    <span class="price">€${pricing.amount}</span>
                    <span class="period">/${isAnnualBilling ? 'year' : 'month'}</span>
                </div>
                <p>${getPlanDescription(plan.id)}</p>
            </div>
            
            <div class="plan-features-summary">
                <h5>${i18next.t('subscriptions.features')}:</h5>
                <ul>
                    ${getPlanFeatures(plan.id).map(feature => `
                        <li><i class="fas fa-check"></i> ${feature}</li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="subscribeToPlan('${planId}')">
                    ${i18next.t('subscriptions.subscribe')}
                </button>
            </div>
        </div>
    `;
    
    if (modal) {
        modal.style.display = 'block';
    }
}

// Subscribe to plan
async function subscribeToPlan(planId) {
    try {
        showLoading(true);
        
        const plan = availablePlans.find(p => p.id === planId);
        const pricing = isAnnualBilling ? plan.annual : plan.monthly;
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token');
        }
        
        const response = await fetch('/api/subscriptions/create-checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                priceId: pricing.priceId,
                planId: planId,
                billingCycle: isAnnualBilling ? 'annual' : 'monthly'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.checkoutUrl) {
                // Redirect to Stripe checkout
                window.location.href = data.checkoutUrl;
            } else {
                showNotification('Checkout URL not received', 'error');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create checkout session');
        }
        
    } catch (error) {
        console.error('❌ Error subscribing to plan:', error);
        showNotification(error.message || 'Failed to subscribe to plan', 'error');
    } finally {
        showLoading(false);
        closeModal();
    }
}

// Change plan
function changePlan() {
    // Scroll to plans section
    document.querySelector('.plans-section').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Cancel subscription
async function cancelSubscription() {
    if (!confirm(i18next.t('subscriptions.confirm_cancel'))) {
        return;
    }
    
    try {
        showLoading(true);
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token');
        }
        
        const response = await fetch('/api/subscriptions/cancel', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('Subscription cancelled successfully', 'success');
            loadCurrentSubscription(); // Refresh subscription status
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to cancel subscription');
        }
        
    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
        showNotification(error.message || 'Failed to cancel subscription', 'error');
    } finally {
        showLoading(false);
    }
}

// Open billing portal
async function openBillingPortal() {
    try {
        showLoading(true);
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token');
        }
        
        const response = await fetch('/api/subscriptions/billing-portal', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.portalUrl) {
                window.open(data.portalUrl, '_blank');
            } else {
                showNotification('Billing portal URL not received', 'error');
            }
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to open billing portal');
        }
        
    } catch (error) {
        console.error('❌ Error opening billing portal:', error);
        showNotification(error.message || 'Failed to open billing portal', 'error');
    } finally {
        showLoading(false);
    }
}

// Download invoices
function downloadInvoices() {
    showNotification('Invoice download feature coming soon!', 'info');
}

// Contact support
function contactSupport() {
    window.open('mailto:support@chronoshr.com?subject=Subscription Support', '_blank');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'block' : 'none';
    }
    isLoading = show;
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    
    if (!container) {
        console.error('❌ Notification container not found');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Show plans error
function showPlansError() {
    const container = document.getElementById('plansGrid');
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Failed to load subscription plans</span>
            </div>
        `;
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (error) {
        return 'Invalid date';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

// Export functions for global access
window.subscriptions = {
    loadCurrentSubscription,
    loadSubscriptionPlans,
    subscribeToPlan,
    changePlan,
    cancelSubscription,
    openBillingPortal,
    downloadInvoices,
    contactSupport,
    closeModal,
    showNotification
}; 