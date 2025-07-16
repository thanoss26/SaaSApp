// Payroll Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    initializeInteractions();
});

function initializeCharts() {
    // Payroll Cost Overview Chart (Bar Chart)
    const payrollCtx = document.getElementById('payrollChart');
    if (payrollCtx) {
        const payrollChart = new Chart(payrollCtx, {
            type: 'bar',
            data: {
                labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
                datasets: [
                    {
                        label: 'Cost',
                        data: [3200, 4500, 3800, 5200, 8740, 6800, 7200, 8900, 9500],
                        backgroundColor: '#6366f1',
                        borderRadius: 6,
                        borderSkipped: false,
                    },
                    {
                        label: 'Expense',
                        data: [800, 1200, 950, 1400, 2110, 1600, 1800, 2200, 2400],
                        backgroundColor: '#a855f7',
                        borderRadius: 6,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return context[0].label + ' 2024';
                            },
                            label: function(context) {
                                const value = context.parsed.y.toLocaleString();
                                const percentage = context.dataset.label === 'Cost' ? '51.3%' : '12.1%';
                                const arrow = '↗';
                                return `${context.dataset.label}: $${value}.00 ${arrow} ${percentage}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e2e8f0',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                return '$' + (value / 1000) + 'k';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Bonuses and Incentives Chart (Donut Chart)
    const bonusesCtx = document.getElementById('bonusesChart');
    if (bonusesCtx) {
        const bonusesChart = new Chart(bonusesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Bonuses', 'Incentives'],
                datasets: [{
                    data: [5100, 5400],
                    backgroundColor: ['#3b82f6', '#10b981'],
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
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.toLocaleString();
                                return `${context.label}: $${value}`;
                            }
                        }
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
}

function initializeInteractions() {
    // Alert banner close functionality
    const closeIcon = document.querySelector('.close-icon');
    const alertBanner = document.querySelector('.alert-banner');
    
    if (closeIcon && alertBanner) {
        closeIcon.addEventListener('click', function() {
            alertBanner.style.display = 'none';
        });
    }

    // Table interactions
    const selectAllCheckbox = document.querySelector('.select-all');
    const rowCheckboxes = document.querySelectorAll('.payroll-table tbody input[type="checkbox"]');
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.payroll-table tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Filter functionality
    const filterInputs = document.querySelectorAll('.filter-input, .filter-dropdown');
    filterInputs.forEach(input => {
        input.addEventListener('change', applyFilters);
        input.addEventListener('input', applyFilters);
    });

    // Action buttons
    const actionIcons = document.querySelectorAll('.action-icon');
    actionIcons.forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.classList.contains('fa-eye') ? 'view' : 'more';
            const row = this.closest('tr');
            const employeeName = row.querySelector('.employee-info span').textContent;
            
            if (action === 'view') {
                showEmployeeDetails(employeeName);
            } else {
                showActionMenu(this, employeeName);
            }
        });
    });

    // New Payroll button
    const newPayrollBtn = document.querySelector('.new-payroll-btn');
    if (newPayrollBtn) {
        newPayrollBtn.addEventListener('click', function() {
            // Redirect to payroll creation page or show modal
            console.log('Create new payroll');
        });
    }

    // Export button
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportPayrollData();
        });
    }
}

function applyFilters() {
    const searchTerm = document.querySelector('.filter-input')?.value.toLowerCase() || '';
    const statusFilter = document.querySelector('.filter-dropdown:first-of-type')?.value || 'All Status';
    const roleFilter = document.querySelector('.filter-dropdown:last-of-type')?.value || 'All Role';
    
    const tableRows = document.querySelectorAll('.payroll-table tbody tr');
    
    tableRows.forEach(row => {
        const employeeName = row.querySelector('.employee-info span').textContent.toLowerCase();
        const role = row.querySelector('td:nth-child(4)').textContent;
        const status = row.querySelector('.status-badge').textContent;
        
        const matchesSearch = employeeName.includes(searchTerm);
        const matchesStatus = statusFilter === 'All Status' || status === statusFilter;
        const matchesRole = roleFilter === 'All Role' || role === roleFilter;
        
        if (matchesSearch && matchesStatus && matchesRole) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function showEmployeeDetails(employeeName) {
    // Create and show a modal with employee details
    const modal = document.createElement('div');
    modal.className = 'employee-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${employeeName} - Payroll Details</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>Payment Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="label">Payroll ID:</span>
                            <span class="value">PYRL120124</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Total Salary:</span>
                            <span class="value">$2,500.00</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Reimbursement:</span>
                            <span class="value">$500.00</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Status:</span>
                            <span class="value status-completed">Completed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add modal styles
    const style = document.createElement('style');
    style.textContent = `
        .employee-modal {
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
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            margin: 0;
            color: #1e293b;
        }
        .close-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
        }
        .modal-body {
            padding: 1.5rem;
        }
        .detail-section h4 {
            margin-bottom: 1rem;
            color: #1e293b;
        }
        .detail-grid {
            display: grid;
            gap: 1rem;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem;
            background: #f8fafc;
            border-radius: 8px;
        }
        .detail-item .label {
            color: #64748b;
            font-weight: 500;
        }
        .detail-item .value {
            color: #1e293b;
            font-weight: 600;
        }
        .status-completed {
            color: #065f46;
            background: #dcfce7;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
        }
    `;
    document.head.appendChild(style);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.head.removeChild(style);
        }
    });
}

function showActionMenu(icon, employeeName) {
    // Create dropdown menu for more actions
    const menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.innerHTML = `
        <div class="menu-item">
            <i class="fas fa-edit"></i>
            Edit Payroll
        </div>
        <div class="menu-item">
            <i class="fas fa-download"></i>
            Download PDF
        </div>
        <div class="menu-item">
            <i class="fas fa-trash"></i>
            Delete Payroll
        </div>
    `;
    
    // Position menu
    const rect = icon.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = rect.bottom + 5 + 'px';
    menu.style.left = rect.left - 100 + 'px';
    menu.style.zIndex = '1000';
    
    document.body.appendChild(menu);
    
    // Add menu styles
    const style = document.createElement('style');
    style.textContent = `
        .action-menu {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }
        .menu-item {
            padding: 0.75rem 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 0.875rem;
            color: #1e293b;
        }
        .menu-item:hover {
            background: #f8fafc;
        }
        .menu-item i {
            width: 16px;
            color: #64748b;
        }
    `;
    document.head.appendChild(style);
    
    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && e.target !== icon) {
            document.body.removeChild(menu);
            document.head.removeChild(style);
            document.removeEventListener('click', closeMenu);
                    }
                });
            }

function exportPayrollData() {
    // Simulate export functionality
    console.log('Exporting payroll data...');
    
    // Create a simple CSV export
    const table = document.querySelector('.payroll-table');
    const rows = table.querySelectorAll('tbody tr');
    let csv = 'Payroll ID,Employee Name,Role,Date & Time,Total Salary,Reimbursement,Status\n';
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const payrollId = cells[1].textContent;
        const employeeName = cells[2].querySelector('span').textContent;
        const role = cells[3].textContent;
        const dateTime = cells[4].textContent;
        const totalSalary = cells[5].textContent;
        const reimbursement = cells[6].textContent;
        const status = cells[7].querySelector('.status-badge').textContent;
        
        csv += `"${payrollId}","${employeeName}","${role}","${dateTime}","${totalSalary}","${reimbursement}","${status}"\n`;
    });
    
    // Download CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payroll-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Update KPI values with real-time data (simulated)
function updateKPIs() {
    // Simulate real-time updates
    const kpiValues = document.querySelectorAll('.kpi-value');
    kpiValues.forEach(value => {
        const currentValue = value.textContent;
        const numericValue = parseFloat(currentValue.replace(/[$,]/g, ''));
        
        // Simulate small fluctuations
        const fluctuation = (Math.random() - 0.5) * 0.02; // ±1% fluctuation
        const newValue = numericValue * (1 + fluctuation);
        
        if (currentValue.includes('$')) {
            value.textContent = '$' + newValue.toLocaleString();
        } else {
            value.textContent = Math.round(newValue).toLocaleString();
        }
    });
}

// Update KPIs every 30 seconds (simulated real-time updates)
setInterval(updateKPIs, 30000); 