// Analytics Page JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    // Check if we have a token
    const token = localStorage.getItem('token');
    if (token) {
        console.log('✅ Token exists, checking organization requirement instantly');
        // Show organization requirement immediately, then fetch to confirm
        showOrganizationRequired();
        await checkOrganizationAndInitialize();
    } else {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
    }
});

async function checkOrganizationAndInitialize() {
    try {
        console.log('🔍 Analytics - Checking organization requirement and initializing...');
        
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

        console.log('🔍 Analytics - Profile loaded:', profile);
        
        // Extract actual profile data if nested
        const profileData = profile.profile || profile;
        
        // Role-based analytics logic
        switch (profileData.role) {
            case 'super_admin':
                // Super admin ALWAYS sees website analytics dashboard
                console.log('👑 Super admin detected - showing website analytics dashboard');
                showWebsiteAnalytics();
                break;
                
            case 'admin':
            case 'employee':
            default:
                // Regular users need organization to access analytics
                if (!profileData.organization_id) {
                    console.log('❌ Organization required for role:', profileData.role);
                    showOrganizationRequired();
                } else {
                    console.log('✅ Organization check passed - showing organization analytics');
                    hideOrganizationRequired();
                    initializeAnalytics();
                }
                break;
        }
        
    } catch (error) {
        console.error('⚠️ Analytics initialization error:', error);
        // On error, show organization requirement for safety
        showOrganizationRequired();
    }
}

function showOrganizationRequired() {
    console.log('🚫 Showing organization requirement screen');
    const orgRequiredSection = document.getElementById('organizationRequired');
    const analyticsContent = document.querySelector('.analytics-content');
    
    if (orgRequiredSection) {
        orgRequiredSection.style.display = 'block';
    }
    if (analyticsContent) {
        analyticsContent.style.display = 'none';
    }
}

function hideOrganizationRequired() {
    console.log('✅ Hiding organization requirement screen');
    const orgRequiredSection = document.getElementById('organizationRequired');
    const analyticsContent = document.querySelector('.analytics-content');
    
    if (orgRequiredSection) {
        orgRequiredSection.style.display = 'none';
    }
    if (analyticsContent) {
        analyticsContent.style.display = 'block';
    }
}

function showWebsiteAnalytics() {
    console.log('👑 Showing super admin website analytics');
    hideOrganizationRequired();
    
    // Update page title and description for super admin
    const analyticsTitle = document.querySelector('.analytics-title');
    if (analyticsTitle) {
        analyticsTitle.textContent = 'Website Analytics Dashboard';
    }

    const analyticsSubtitle = document.querySelector('.analytics-subtitle');
    if (analyticsSubtitle) {
        analyticsSubtitle.textContent = 'Platform-wide performance metrics and user engagement analytics';
    }

    // Update navigation for super admin - hide irrelevant nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        const span = item.querySelector('span');
        
        if (href === '/payroll') {
            // Replace payroll with user management
            item.setAttribute('href', '/users');
            item.querySelector('i').className = 'fas fa-users';
            span.textContent = 'User Management';
        } else if (href === '/organizations') {
            // Keep organizations for super admin (they manage all orgs)
            span.textContent = 'All Organizations';
        }
    });

    // Update export button for website analytics
    const exportBtn = document.querySelector('.topbar-right .btn-primary');
    if (exportBtn) {
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Platform Report';
    }

    // Update alert banner for super admin
    const alertText = document.querySelector('.alert-text');
    if (alertText) {
        alertText.textContent = 'Platform insights available! User engagement increased by 23% across all organizations this month.';
    }

    // Initialize with website-wide data
    initializeWebsiteAnalytics();
}

async function initializeWebsiteAnalytics() {
    console.log('📈 Loading website analytics...');
    
    try {
        // Load website-wide analytics data
        await loadWebsiteMetrics();
        await loadWebsiteCharts();
        
    } catch (error) {
        console.error('❌ Error loading website analytics:', error);
    }
}

async function loadWebsiteMetrics() {
    // Realistic website analytics metrics for super admin
    const metrics = {
        totalPageViews: 24680,
        uniqueVisitors: 1847,
        averageSessionDuration: '5:42',
        bounceRate: '32.5%'
    };

    // Update metric cards with website analytics
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 4) {
        // First card - Total Page Views
        statCards[0].querySelector('.stat-label').textContent = 'Total Page Views';
        statCards[0].querySelector('.stat-value').textContent = metrics.totalPageViews.toLocaleString();
        statCards[0].querySelector('.stat-trend').textContent = '+15% this month';
        
        // Second card - Unique Visitors
        statCards[1].querySelector('.stat-label').textContent = 'Unique Visitors';
        statCards[1].querySelector('.stat-value').textContent = metrics.uniqueVisitors.toLocaleString();
        statCards[1].querySelector('.stat-trend').textContent = '+12% this month';
        
        // Third card - Average Session Duration
        statCards[2].querySelector('.stat-label').textContent = 'Avg Session Duration';
        statCards[2].querySelector('.stat-value').textContent = metrics.averageSessionDuration;
        statCards[2].querySelector('.stat-trend').textContent = '+8% this month';
        
        // Fourth card - Bounce Rate
        statCards[3].querySelector('.stat-label').textContent = 'Bounce Rate';
        statCards[3].querySelector('.stat-value').textContent = metrics.bounceRate;
        statCards[3].querySelector('.stat-trend').textContent = '-3.2% this month';
        statCards[3].querySelector('.stat-trend').className = 'stat-trend down'; // Good trend for bounce rate
    }
}

async function loadWebsiteCharts() {
    try {
        console.log('📊 Loading website analytics charts...');
        
        // Update chart headers for super admin (already updated in HTML)
        
        // 1. Website Traffic Trend Chart (growthChart)
        const trafficCanvas = document.getElementById('growthChart');
        if (trafficCanvas) {
            const trafficCtx = trafficCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.trafficChart instanceof Chart) {
                window.trafficChart.destroy();
            }
            
            window.trafficChart = new Chart(trafficCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                        label: 'Total Visitors',
                        data: [12400, 13200, 14800, 16200, 17800, 19400, 21000, 22600, 24200, 25800, 27400, 29000],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Unique Visitors',
                        data: [8600, 9200, 10400, 11600, 12800, 14000, 15200, 16400, 17600, 18800, 20000, 21200],
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        tension: 0.4,
                        fill: true
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
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
        }

        // 2. System Performance Chart (productivityChart)
        const performanceCanvas = document.getElementById('productivityChart');
        if (performanceCanvas) {
            const performanceCtx = performanceCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.performanceChart instanceof Chart) {
                window.performanceChart.destroy();
            }
            
            window.performanceChart = new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [120, 135, 180, 165, 145, 130],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    }, {
                        label: 'CPU Usage (%)',
                        data: [45, 52, 68, 61, 58, 49],
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
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
                            type: 'linear',
                            display: true,
                            position: 'left',
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    }
                }
            });
        }

        // 3. Traffic Sources Donut Chart (departmentChart)
        const sourcesCanvas = document.getElementById('departmentChart');
        if (sourcesCanvas) {
            const sourcesCtx = sourcesCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.sourcesChart instanceof Chart) {
                window.sourcesChart.destroy();
            }
            
            window.sourcesChart = new Chart(sourcesCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Organic Search', 'Direct', 'Social Media', 'Email', 'Referral'],
                    datasets: [{
                        data: [40, 25, 15, 12, 8],
                        backgroundColor: [
                            '#667eea',
                            '#f093fb',
                            '#f6d55c',
                            '#3bcf8e',
                            '#ff6b6b'
                        ],
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // 4. Device Types Donut Chart (projectChart)
        const deviceCanvas = document.getElementById('projectChart');
        if (deviceCanvas) {
            const deviceCtx = deviceCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.deviceChart instanceof Chart) {
                window.deviceChart.destroy();
            }
            
            window.deviceChart = new Chart(deviceCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Desktop', 'Mobile', 'Tablet'],
                    datasets: [{
                        data: [55, 35, 10],
                        backgroundColor: [
                            '#667eea',
                            '#f093fb',
                            '#f6d55c'
                        ],
                        borderWidth: 0,
                        cutout: '70%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        console.log('✅ Website analytics charts loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading website charts:', error);
    }
}

function initializeAnalytics() {
    // Initialize charts
    initializeGrowthChart();
    initializeDepartmentChart();
    initializeProductivityChart();
    initializeProjectChart();
    
    // Initialize interactive elements
    initializeChartTabs();
    initializeAlertBanner();
    initializeTableInteractions();
    initializeDateSelector();
    initializeExport();
    
    // Load analytics data
    loadAnalyticsData();
}

// Employee Growth Trend Chart
function initializeGrowthChart() {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;

    const growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [
                {
                    label: 'Total Employees',
                    data: [1100, 1150, 1180, 1200, 1220, 1240, 1247],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Active Employees',
                    data: [1050, 1100, 1130, 1150, 1170, 1190, 1195],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#f3f4f6'
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 3,
                    hoverRadius: 5
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Department Distribution Chart
function initializeDepartmentChart() {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;

    const departmentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'],
            datasets: [{
                data: [342, 156, 234, 89, 67, 359],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#06b6d4'
                ],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });
}

// Productivity Trends Chart
function initializeProductivityChart() {
    const ctx = document.getElementById('productivityChart');
    if (!ctx) return;

    const productivityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Productivity Score',
                data: [85, 88, 92, 87, 90, 82, 79],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3b82f6',
                borderWidth: 0,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#f3f4f6'
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    min: 70,
                    max: 100
                }
            }
        }
    });
}

// Project Status Chart
function initializeProjectChart() {
    const ctx = document.getElementById('projectChart');
    if (!ctx) return;

    const projectChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'In Progress', 'On Hold', 'Cancelled'],
            datasets: [{
                data: [45, 28, 12, 4],
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                }
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });
}

// Chart Tabs Functionality
function initializeChartTabs() {
    const tabs = document.querySelectorAll('.chart-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Update chart based on selected period
            const period = this.textContent.toLowerCase();
            updateProductivityChart(period);
        });
    });
}

// Update Productivity Chart based on selected period
function updateProductivityChart(period) {
    const ctx = document.getElementById('productivityChart');
    if (!ctx) return;

    // Sample data for different periods
    const dataMap = {
        'daily': [85, 88, 92, 87, 90, 82, 79],
        'weekly': [87, 89, 91, 88, 86, 84, 85],
        'monthly': [88, 90, 89, 91, 87, 88, 89]
    };

    const newData = dataMap[period] || dataMap['daily'];
    
    // Update chart data
    if (window.productivityChart) {
        window.productivityChart.data.datasets[0].data = newData;
        window.productivityChart.update('active');
    }
}

// Alert Banner Functionality
function initializeAlertBanner() {
    const closeIcon = document.querySelector('.close-icon');
    const alertBanner = document.querySelector('.alert-banner');
    const moreDetailsBtn = document.querySelector('.more-details-btn');

    if (closeIcon) {
        closeIcon.addEventListener('click', function() {
            alertBanner.style.display = 'none';
        });
    }

    if (moreDetailsBtn) {
        moreDetailsBtn.addEventListener('click', function() {
            showInsightsModal();
        });
    }
}

// Table Interactions
function initializeTableInteractions() {
    const viewAllButtons = document.querySelectorAll('.btn-outline');
    viewAllButtons.forEach(button => {
        button.addEventListener('click', function() {
            const cardHeader = this.closest('.card-header');
            const tableTitle = cardHeader.querySelector('span').textContent;
            showDetailedView(tableTitle);
        });
    });
}

// Date Selector Functionality
function initializeDateSelector() {
    const dateDropdown = document.querySelector('.date-dropdown');
    if (dateDropdown) {
        dateDropdown.addEventListener('change', function() {
            updateAnalyticsData(this.value);
        });
    }
}

// Export Functionality
function initializeExport() {
    const exportBtn = document.querySelector('.btn-primary');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportAnalyticsReport();
        });
    }
}

// Load Analytics Data
function loadAnalyticsData() {
    // Simulate loading analytics data
    console.log('📊 Loading analytics data...');
    
    // Update stats cards with real data
    updateStatsCards();
}

// Update Stats Cards
function updateStatsCards() {
    const statValues = document.querySelectorAll('.stat-value');
    const statTrends = document.querySelectorAll('.stat-trend');
    
    // Animate stat values
    statValues.forEach((stat, index) => {
        const finalValue = stat.textContent;
        animateValue(stat, 0, parseInt(finalValue.replace(/[^\d]/g, '')), 1000);
    });
}

// Animate numeric values
function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const startValue = start;
    const change = end - start;
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (change * progress));
        element.textContent = currentValue.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

// Show Insights Modal
function showInsightsModal() {
    // Create modal for detailed insights
    const modal = document.createElement('div');
    modal.className = 'insights-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detailed Insights</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="insight-item">
                    <h4>Employee Productivity Increase</h4>
                    <p>Productivity has increased by 15% this month due to improved workflow processes and better resource allocation.</p>
                </div>
                <div class="insight-item">
                    <h4>Department Performance</h4>
                    <p>Engineering and Sales departments show the highest performance metrics, while HR shows steady improvement.</p>
                </div>
                <div class="insight-item">
                    <h4>Project Completion Rate</h4>
                    <p>Project completion rate has improved by 8% compared to last month, with better project management practices.</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Show Detailed View
function showDetailedView(tableTitle) {
    console.log(`📋 Showing detailed view for: ${tableTitle}`);
    // Implement detailed view functionality
    alert(`Detailed view for ${tableTitle} would open here.`);
}

// Export Analytics Report
function exportAnalyticsReport() {
    console.log('📤 Exporting analytics report...');
    // Implement export functionality
    alert('Analytics report export would start here.');
}

// Update Analytics Data based on date range
function updateAnalyticsData(dateRange) {
    console.log(`📅 Updating analytics data for: ${dateRange}`);
    // Implement date range filtering
    // This would typically make an API call to get filtered data
}

// Add CSS for insights modal
const modalStyles = `
<style>
.insights-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #f3f4f6;
}

.modal-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
}

.close-modal {
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
    border-radius: 4px;
    transition: all 0.2s ease;
}

.close-modal:hover {
    background: #f3f4f6;
    color: #374151;
}

.modal-body {
    padding: 24px;
}

.insight-item {
    margin-bottom: 20px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;
    border-left: 4px solid #3b82f6;
}

.insight-item:last-child {
    margin-bottom: 0;
}

.insight-item h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

.insight-item p {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.5;
}
</style>
`;

// Add modal styles to head
document.head.insertAdjacentHTML('beforeend', modalStyles); 