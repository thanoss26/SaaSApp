// Subscription Settings JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initPage();
});

let currentSubscription = null;
let availablePlans = null;
let selectedPlanForChange = null;

async function initPage() {
    try {
        // Check authentication
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        // Load user info
        await loadUserInfo();
        
        // Load subscription data
        await Promise.all([
            loadCurrentSubscription(),
            loadAvailablePlans(),
            loadPaymentHistory()
        ]);

        // Initialize event listeners
        initEventListeners();

    } catch (error) {
        console.error('❌ Error initializing page:', error);
        showNotification('Failed to load subscription data', 'error');
    }
}

async function loadUserInfo() {
    try {
        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                document.getElementById('userName').textContent = data.user.full_name || data.user.email;
            }
        }
    } catch (error) {
        console.error('❌ Error loading user info:', error);
    }
}

async function loadCurrentSubscription() {
    try {
        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch('/api/subscriptions/current', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            currentSubscription = data.subscription;
            renderCurrentSubscription();
        } else {
            renderNoSubscription();
        }
    } catch (error) {
        console.error('❌ Error loading current subscription:', error);
        renderNoSubscription();
    }
}

async function loadAvailablePlans() {
    try {
        const response = await fetch('/api/subscriptions/plans');
        const data = await response.json();
        
        if (data.success) {
            availablePlans = data.plans;
            renderAvailablePlans();
        }
    } catch (error) {
        console.error('❌ Error loading available plans:', error);
        renderPlansError();
    }
}

async function loadPaymentHistory() {
    try {
        if (!currentSubscription) {
            renderNoPayments();
            return;
        }

        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch(`/api/subscriptions/${currentSubscription.stripe_subscription_id}/payments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            renderPaymentHistory(data.payments);
        } else {
            renderNoPayments();
        }
    } catch (error) {
        console.error('❌ Error loading payment history:', error);
        renderNoPayments();
    }
}

function renderCurrentSubscription() {
    const subscriptionCard = document.getElementById('subscriptionCard');
    
    if (!currentSubscription) {
        subscriptionCard.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card"></i>
                <h3>No Active Subscription</h3>
                <p>You don't have an active subscription. Choose a plan below to get started.</p>
            </div>
        `;
        return;
    }

    const statusBadge = getStatusBadge(currentSubscription.status);
    const nextBillingDate = currentSubscription.current_period_end ? 
        new Date(currentSubscription.current_period_end).toLocaleDateString() : 'N/A';

    subscriptionCard.innerHTML = `
        <div class="subscription-info">
            <div class="subscription-details">
                <h3>${getPlanName(currentSubscription.price_id)}</h3>
                <div class="subscription-meta">
                    <div class="meta-item">
                        <span class="meta-label">Status</span>
                        <span class="meta-value">${statusBadge}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Next Billing</span>
                        <span class="meta-value">${nextBillingDate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Subscription ID</span>
                        <span class="meta-value">${currentSubscription.stripe_subscription_id}</span>
                    </div>
                </div>
                <div class="subscription-actions">
                    <button class="btn btn-outline" onclick="openChangePlanModal()">
                        <i class="fas fa-exchange-alt"></i>
                        Change Plan
                    </button>
                    <button class="btn btn-outline" onclick="openBillingPortal()">
                        <i class="fas fa-credit-card"></i>
                        Manage Billing
                    </button>
                    <button class="btn btn-danger" onclick="openCancelModal()">
                        <i class="fas fa-times"></i>
                        Cancel Subscription
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderNoSubscription() {
    const subscriptionCard = document.getElementById('subscriptionCard');
    subscriptionCard.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-credit-card"></i>
            <h3>No Active Subscription</h3>
            <p>You don't have an active subscription. Choose a plan below to get started.</p>
        </div>
    `;
}

function renderAvailablePlans() {
    const plansGrid = document.getElementById('plansGrid');
    
    if (!availablePlans || availablePlans.length === 0) {
        plansGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>No Plans Available</h3>
                <p>No subscription plans are currently available.</p>
            </div>
        `;
        return;
    }

    const plansHTML = availablePlans.map(plan => {
        const isCurrentPlan = currentSubscription && 
            (currentSubscription.price_id === plan.monthly.priceId || 
             currentSubscription.price_id === plan.annual.priceId);

        return `
            <div class="plan-card ${isCurrentPlan ? 'selected' : ''}" onclick="selectPlan('${plan.id}')">
                <div class="plan-header">
                    <div class="plan-name">${plan.name}</div>
                    <div class="plan-price">€${Math.round(plan.monthly.amount)}</div>
                    <div class="plan-period">per month</div>
                </div>
                <ul class="plan-features">
                    <li><i class="fas fa-check"></i> Up to ${getEmployeeLimit(plan.id)} employees</li>
                    <li><i class="fas fa-check"></i> ${getFeatureDescription(plan.id)}</li>
                    <li><i class="fas fa-check"></i> ${getSupportLevel(plan.id)}</li>
                    ${plan.id === 'enterprise' ? '<li><i class="fas fa-check"></i> Dedicated account manager</li>' : ''}
                </ul>
                ${isCurrentPlan ? 
                    '<div class="current-plan-badge">Current Plan</div>' : 
                    '<button class="btn btn-primary" onclick="subscribeToPlan(\'' + plan.id + '\')">Subscribe</button>'
                }
            </div>
        `;
    }).join('');

    plansGrid.innerHTML = plansHTML;
}

function renderPlansError() {
    const plansGrid = document.getElementById('plansGrid');
    plansGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Plans</h3>
            <p>Failed to load subscription plans. Please try again later.</p>
        </div>
    `;
}

function renderPaymentHistory(payments) {
    const paymentsTable = document.getElementById('paymentsTable');
    
    if (!payments || payments.length === 0) {
        paymentsTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h3>No Payment History</h3>
                <p>No payment history available for your subscription.</p>
            </div>
        `;
        return;
    }

    const paymentsHTML = payments.map(payment => {
        const date = new Date(payment.created_at).toLocaleDateString();
        const amount = (payment.amount / 100).toFixed(2);
        const statusBadge = getPaymentStatusBadge(payment.status);

        return `
            <div class="payment-item">
                <div class="payment-date">${date}</div>
                <div class="payment-amount">€${amount}</div>
                <div class="payment-status">${statusBadge}</div>
                <div class="payment-actions">
                    <button class="btn btn-outline" onclick="viewInvoice('${payment.stripe_invoice_id}')">
                        <i class="fas fa-download"></i>
                        Invoice
                    </button>
                </div>
            </div>
        `;
    }).join('');

    paymentsTable.innerHTML = `
        <div class="payments-header">
            <h3>Payment History</h3>
        </div>
        <div class="payments-list">
            ${paymentsHTML}
        </div>
    `;
}

function renderNoPayments() {
    const paymentsTable = document.getElementById('paymentsTable');
    paymentsTable.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <h3>No Payment History</h3>
            <p>No payment history available.</p>
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'active': '<span class="status-badge status-success">Active</span>',
        'trialing': '<span class="status-badge status-success">Trial</span>',
        'past_due': '<span class="status-badge status-failed">Past Due</span>',
        'canceled': '<span class="status-badge status-failed">Canceled</span>',
        'incomplete': '<span class="status-badge status-failed">Incomplete</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function getPaymentStatusBadge(status) {
    const badges = {
        'succeeded': '<span class="status-badge status-success">Paid</span>',
        'failed': '<span class="status-badge status-failed">Failed</span>',
        'pending': '<span class="status-badge">Pending</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

function getPlanName(priceId) {
    if (!availablePlans) return 'Unknown Plan';
    
    for (const plan of availablePlans) {
        if (plan.monthly.priceId === priceId || plan.annual.priceId === priceId) {
            return plan.name;
        }
    }
    return 'Unknown Plan';
}

function getEmployeeLimit(planId) {
    const limits = {
        'starter': '50',
        'professional': '200',
        'enterprise': 'Unlimited'
    };
    return limits[planId] || 'Unknown';
}

function getFeatureDescription(planId) {
    const features = {
        'starter': 'Basic HR features',
        'professional': 'Advanced HR features',
        'enterprise': 'All features included'
    };
    return features[planId] || 'Features';
}

function getSupportLevel(planId) {
    const support = {
        'starter': 'Email support',
        'professional': 'Priority support',
        'enterprise': '24/7 support'
    };
    return support[planId] || 'Support';
}

function selectPlan(planId) {
    selectedPlanForChange = planId;
    
    // Update plan options in modal
    const planOptions = document.getElementById('planOptions');
    if (!availablePlans) return;

    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return;

    planOptions.innerHTML = `
        <div class="plan-option" onclick="selectPlanOption('monthly')">
            <input type="radio" name="planOption" value="monthly" id="monthly">
            <div class="plan-option-info">
                <div class="plan-option-name">${plan.name} - Monthly</div>
                <div class="plan-option-price">€${plan.monthly.amount}/month</div>
            </div>
        </div>
        <div class="plan-option" onclick="selectPlanOption('annual')">
            <input type="radio" name="planOption" value="annual" id="annual">
            <div class="plan-option-info">
                <div class="plan-option-name">${plan.name} - Annual</div>
                <div class="plan-option-price">€${plan.annual.amount}/year (Save ${plan.annual.savings}%)</div>
            </div>
        </div>
    `;
}

function selectPlanOption(option) {
    // Update radio button
    document.getElementById(option).checked = true;
    
    // Update visual selection
    document.querySelectorAll('.plan-option').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
}

async function subscribeToPlan(planId) {
    try {
        const plan = availablePlans.find(p => p.id === planId);
        if (!plan) {
            showNotification('Plan not found', 'error');
            return;
        }

        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch('/api/subscriptions/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                priceId: plan.monthly.priceId,
                successUrl: `${window.location.origin}/subscription-settings.html?subscription=success`,
                cancelUrl: `${window.location.origin}/subscription-settings.html`
            })
        });

        const data = await response.json();
        
        if (data.success && data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('Failed to create checkout session');
        }
    } catch (error) {
        console.error('❌ Error subscribing to plan:', error);
        showNotification('Failed to start subscription process', 'error');
    }
}

async function openBillingPortal() {
    try {
        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch('/api/subscriptions/create-portal-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                returnUrl: window.location.href
            })
        });

        const data = await response.json();
        
        if (data.success && data.url) {
            window.location.href = data.url;
        } else {
            throw new Error('Failed to create portal session');
        }
    } catch (error) {
        console.error('❌ Error opening billing portal:', error);
        showNotification('Failed to open billing portal', 'error');
    }
}

function openChangePlanModal() {
    if (!availablePlans) {
        showNotification('No plans available', 'error');
        return;
    }

    // Select first plan by default
    selectPlan(availablePlans[0].id);
    document.getElementById('changePlanModal').classList.add('show');
}

function openCancelModal() {
    document.getElementById('cancelModal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

async function confirmCancel() {
    try {
        const cancelType = document.querySelector('input[name="cancelType"]:checked').value;
        const cancelAtPeriodEnd = cancelType === 'end_of_period';

        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch('/api/subscriptions/cancel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscriptionId: currentSubscription.stripe_subscription_id,
                cancelAtPeriodEnd: cancelAtPeriodEnd
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Subscription cancelled successfully', 'success');
            closeModal('cancelModal');
            await loadCurrentSubscription();
        } else {
            throw new Error('Failed to cancel subscription');
        }
    } catch (error) {
        console.error('❌ Error cancelling subscription:', error);
        showNotification('Failed to cancel subscription', 'error');
    }
}

async function confirmChangePlan() {
    try {
        const selectedOption = document.querySelector('input[name="planOption"]:checked');
        if (!selectedOption) {
            showNotification('Please select a plan option', 'error');
            return;
        }

        const plan = availablePlans.find(p => p.id === selectedPlanForChange);
        if (!plan) {
            showNotification('Plan not found', 'error');
            return;
        }

        const priceId = selectedOption.value === 'annual' ? plan.annual.priceId : plan.monthly.priceId;

        const token = localStorage.getItem('supabase.auth.token');
        const response = await fetch('/api/subscriptions/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscriptionId: currentSubscription.stripe_subscription_id,
                newPriceId: priceId
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Plan changed successfully', 'success');
            closeModal('changePlanModal');
            await loadCurrentSubscription();
        } else {
            throw new Error('Failed to change plan');
        }
    } catch (error) {
        console.error('❌ Error changing plan:', error);
        showNotification('Failed to change plan', 'error');
    }
}

function viewInvoice(invoiceId) {
    // This would typically open the invoice in Stripe or download it
    showNotification('Invoice download feature coming soon', 'info');
}

function initEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('supabase.auth.token');
        window.location.href = 'login.html';
    });

    // Modal close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Check for subscription success parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('subscription') === 'success') {
        showNotification('Subscription created successfully!', 'success');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    notification.innerHTML = `
        <i class="${icons[type]}"></i>
        <div class="notification-content">
            <div class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
} 