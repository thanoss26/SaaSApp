class StripePayrollDashboard {
    constructor() {
        this.currentUser = null;
        this.currentOrganization = null;
        this.paymentChart = null;
        this.paymentMethodsChart = null;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            await this.loadUserProfile();
            await this.loadOrganizationData();
            this.setupEventListeners();
            await this.loadDashboardData();
            this.initializeCharts();
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Failed to initialize dashboard');
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user profile');
            }

            this.currentUser = await response.json();
            
            // Update UI with user info
            document.getElementById('userName').textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
            document.getElementById('userRole').textContent = this.currentUser.role;
            
            // Check if user is admin
            if (this.currentUser.role !== 'admin') {
                this.showError('Admin access required for Stripe dashboard');
                return;
            }

        } catch (error) {
            console.error('❌ Load user profile error:', error);
            this.showError('Failed to load user profile');
        }
    }

    async loadOrganizationData() {
        try {
            if (!this.currentUser?.organization_id) {
                throw new Error('No organization associated with user');
            }

            const response = await fetch(`/api/organizations/${this.currentUser.organization_id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load organization data');
            }

            this.currentOrganization = await response.json();
            console.log('✅ Organization data loaded:', this.currentOrganization);

        } catch (error) {
            console.error('❌ Load organization data error:', error);
            this.showError('Failed to load organization data');
        }
    }

    setupEventListeners() {
        // Date range selector
        document.getElementById('dateRange').addEventListener('change', (e) => {
            this.loadDashboardData(e.target.value);
        });

        // Refresh data button
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Open Stripe dashboard button
        document.getElementById('openStripeDashboard').addEventListener('click', () => {
            this.openStripeDashboard();
        });

        // View all payments button
        document.getElementById('viewAllPayments').addEventListener('click', () => {
            this.viewAllPayments();
        });
    }

    async loadDashboardData(dateRange = '30d') {
        if (!this.currentOrganization?.id) {
            console.error('❌ No organization ID available');
            return;
        }

        this.showLoading(true);

        try {
            // Load dashboard summary
            await this.loadDashboardSummary();
            
            // Load payment analytics
            await this.loadPaymentAnalytics(dateRange);
            
            // Load recent payments
            await this.loadRecentPayments();
            
            // Load additional metrics
            await this.loadAdditionalMetrics();

        } catch (error) {
            console.error('❌ Load dashboard data error:', error);
            this.showError('Failed to load dashboard data');
        } finally {
            this.showLoading(false);
        }
    }

    async loadDashboardSummary() {
        try {
            const response = await fetch(`/api/stripe-dashboard/summary/${this.currentOrganization.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load dashboard summary');
            }

            const summary = await response.json();
            
            // Update stats
            document.getElementById('totalRevenue').textContent = `€${(summary.totalRevenue / 100).toFixed(2)}`;
            document.getElementById('totalPayments').textContent = summary.totalPayments;
            document.getElementById('totalCustomers').textContent = summary.totalCustomers;
            document.getElementById('successRate').textContent = `${summary.successRate}%`;

        } catch (error) {
            console.error('❌ Load dashboard summary error:', error);
            // Set default values if API fails
            document.getElementById('totalRevenue').textContent = '€0.00';
            document.getElementById('totalPayments').textContent = '0';
            document.getElementById('totalCustomers').textContent = '0';
            document.getElementById('successRate').textContent = '0%';
        }
    }

    async loadPaymentAnalytics(dateRange) {
        try {
            const response = await fetch(`/api/stripe-dashboard/analytics/${this.currentOrganization.id}?dateRange=${dateRange}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load payment analytics');
            }

            const analytics = await response.json();
            this.updatePaymentChart(analytics);

        } catch (error) {
            console.error('❌ Load payment analytics error:', error);
            // Show empty chart if API fails
            this.updatePaymentChart({ data: [] });
        }
    }

    async loadRecentPayments() {
        try {
            const response = await fetch(`/api/stripe-dashboard/payments/${this.currentOrganization.id}?limit=10`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recent payments');
            }

            const payments = await response.json();
            this.updateRecentPaymentsTable(payments.data || []);

        } catch (error) {
            console.error('❌ Load recent payments error:', error);
            this.updateRecentPaymentsTable([]);
        }
    }

    async loadAdditionalMetrics() {
        try {
            // Load refunds
            const refundsResponse = await fetch(`/api/stripe-dashboard/refunds/${this.currentOrganization.id}?limit=1`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (refundsResponse.ok) {
                const refunds = await refundsResponse.json();
                document.getElementById('totalRefunds').textContent = refunds.totalCount || 0;
            }

            // Load webhook events
            const webhooksResponse = await fetch(`/api/stripe-dashboard/webhooks/${this.currentOrganization.id}?limit=1`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (webhooksResponse.ok) {
                const webhooks = await webhooksResponse.json();
                document.getElementById('webhookEvents').textContent = webhooks.totalCount || 0;
            }

        } catch (error) {
            console.error('❌ Load additional metrics error:', error);
        }
    }

    updatePaymentChart(analytics) {
        const ctx = document.getElementById('paymentChart').getContext('2d');
        
        if (this.paymentChart) {
            this.paymentChart.destroy();
        }

        const labels = analytics.data?.map(item => item.date) || [];
        const amounts = analytics.data?.map(item => item.amount / 100) || [];

        this.paymentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Payment Amount (€)',
                    data: amounts,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    updateRecentPaymentsTable(payments) {
        const tbody = document.getElementById('recentPaymentsBody');
        
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No payments found</td></tr>';
            return;
        }

        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>
                    <div class="customer-info">
                        <div class="customer-name">${payment.customer?.name || 'Unknown Customer'}</div>
                        <div class="customer-email">${payment.customer?.email || 'No email'}</div>
                    </div>
                </td>
                <td class="amount">€${(payment.amount / 100).toFixed(2)}</td>
                <td>
                    <span class="status-badge status-${payment.status}">
                        ${this.getStatusText(payment.status)}
                    </span>
                </td>
                <td>${new Date(payment.created * 1000).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="dashboard.viewPaymentDetails('${payment.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${payment.status === 'succeeded' ? `
                            <button class="btn-icon" onclick="dashboard.createRefund('${payment.id}')" title="Create Refund">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'succeeded': 'Success',
            'pending': 'Pending',
            'failed': 'Failed',
            'canceled': 'Canceled',
            'processing': 'Processing'
        };
        return statusMap[status] || status;
    }

    initializeCharts() {
        // Initialize payment methods chart
        const ctx = document.getElementById('paymentMethodsChart').getContext('2d');
        
        this.paymentMethodsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Credit Card', 'Bank Transfer', 'Other'],
                datasets: [{
                    data: [70, 20, 10],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    openStripeDashboard() {
        // Open Stripe dashboard in new tab
        window.open('https://dashboard.stripe.com', '_blank');
    }

    viewPaymentDetails(paymentId) {
        // Open payment details in Stripe dashboard
        window.open(`https://dashboard.stripe.com/payments/${paymentId}`, '_blank');
    }

    async createRefund(paymentId) {
        if (!confirm('Are you sure you want to create a refund for this payment?')) {
            return;
        }

        try {
            const response = await fetch(`/api/stripe/refunds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    paymentIntentId: paymentId,
                    amount: null, // Full refund
                    reason: 'requested_by_customer'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create refund');
            }

            const refund = await response.json();
            alert('Refund created successfully!');
            
            // Refresh data
            this.loadDashboardData();

        } catch (error) {
            console.error('❌ Create refund error:', error);
            alert('Failed to create refund: ' + error.message);
        }
    }

    viewAllPayments() {
        // Open all payments in Stripe dashboard
        window.open('https://dashboard.stripe.com/payments', '_blank');
    }

    showLoading(show) {
        this.isLoading = show;
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new StripePayrollDashboard();
}); 