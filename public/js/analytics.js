// Analytics Page JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    // Check if we have a token
    const token = localStorage.getItem('token');
    if (token) {
        console.log('✅ Token exists, initializing analytics');
        initializeAnalytics();
    } else {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/login';
    }
});

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