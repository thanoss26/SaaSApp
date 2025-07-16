// Analytics Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeAnalytics();
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
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Active Employees',
                    data: [1050, 1100, 1130, 1150, 1170, 1190, 1195],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
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
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                y: {
                    grid: {
                        color: '#f3f4f6'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
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
                borderRadius: 6,
                borderSkipped: false
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
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                y: {
                    grid: {
                        color: '#f3f4f6'
                    },
                    ticks: {
                        color: '#6b7280',
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

// Chart Tabs
function initializeChartTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Update chart data based on selected period
            updateProductivityChart(this.textContent.toLowerCase());
        });
    });
}

// Update productivity chart based on selected period
function updateProductivityChart(period) {
    const ctx = document.getElementById('productivityChart');
    if (!ctx) return;

    let labels, data;
    
    switch(period) {
        case 'daily':
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            data = [85, 88, 92, 87, 90, 82, 79];
            break;
        case 'weekly':
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            data = [87, 89, 91, 88];
            break;
        case 'monthly':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            data = [84, 86, 88, 87, 89, 91];
            break;
        default:
            return;
    }

    // Update chart data
    const chart = Chart.getChart(ctx);
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    }
}

// Alert Banner
function initializeAlertBanner() {
    const closeIcon = document.querySelector('.close-icon');
    const alertBanner = document.querySelector('.alert-banner');
    
    if (closeIcon && alertBanner) {
        closeIcon.addEventListener('click', function() {
            alertBanner.style.display = 'none';
        });
    }

    const moreDetailsBtn = document.querySelector('.more-details-btn');
    if (moreDetailsBtn) {
        moreDetailsBtn.addEventListener('click', function() {
            // Show detailed insights modal or navigate to insights page
            showInsightsModal();
        });
    }
}

// Table Interactions
function initializeTableInteractions() {
    const viewAllBtns = document.querySelectorAll('.btn-outline');
    
    viewAllBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.card');
            const cardTitle = card.querySelector('.card-header span').textContent;
            
            // Navigate to detailed view or show modal
            showDetailedView(cardTitle);
        });
    });

    // Add hover effects to table rows
    const tableRows = document.querySelectorAll('.employees-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.01)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Date Range Selector
function initializeDateSelector() {
    const dateDropdown = document.querySelector('.date-dropdown');
    if (dateDropdown) {
        dateDropdown.addEventListener('change', function() {
            updateAnalyticsData(this.value);
        });
    }
}

// Export functionality
function initializeExport() {
    const exportBtn = document.querySelector('.btn-primary');
    if (exportBtn && exportBtn.textContent.includes('Export')) {
        exportBtn.addEventListener('click', function() {
            exportAnalyticsReport();
        });
    }
}

// Load Analytics Data
function loadAnalyticsData() {
    // Simulate loading analytics data
    console.log('Loading analytics data...');
    
    // In a real application, this would fetch data from the server
    // fetch('/api/analytics/data')
    //     .then(response => response.json())
    //     .then(data => {
    //         updateKPICards(data.kpis);
    //         updateCharts(data.charts);
    //         updateTables(data.tables);
    //     })
    //     .catch(error => {
    //         console.error('Error loading analytics data:', error);
    //     });
}

// Show Insights Modal
function showInsightsModal() {
    // Create and show a modal with detailed insights
    const modal = document.createElement('div');
    modal.className = 'insights-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Analytics Insights</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="insight-item">
                    <h4>Productivity Increase</h4>
                    <p>Employee productivity has increased by 15% this month compared to last month.</p>
                </div>
                <div class="insight-item">
                    <h4>Top Performing Department</h4>
                    <p>Engineering department shows the highest productivity score at 91.2%.</p>
                </div>
                <div class="insight-item">
                    <h4>Growth Trend</h4>
                    <p>Company has grown by 12% in employee count over the last 6 months.</p>
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
    // Navigate to detailed view or show detailed modal
    console.log(`Showing detailed view for: ${tableTitle}`);
    
    // This could open a new page or show a detailed modal
    // window.location.href = `/analytics/${tableTitle.toLowerCase().replace(/\s+/g, '-')}`;
}

// Export Analytics Report
function exportAnalyticsReport() {
    // Generate and download analytics report
    console.log('Exporting analytics report...');
    
    // This would generate a PDF or Excel report
    // In a real application, this would call the server to generate the report
    alert('Analytics report export functionality would be implemented here.');
}

// Update Analytics Data
function updateAnalyticsData(dateRange) {
    console.log(`Updating analytics data for: ${dateRange}`);
    
    // This would fetch new data based on the selected date range
    // and update all charts and tables accordingly
}

// Initialize all functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeAnalytics();
    initializeDateSelector();
    initializeExport();
});

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