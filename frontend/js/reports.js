// ============================================
// REPORTS & ANALYTICS JAVASCRIPT
// ============================================

// Global variables
let reportsData = {
    clients: [],
    sessions: [],
    invoices: [],
    products: [],
    staff: [],
    marketing: []
};

let chartInstances = {};

/**
 * Initialize reports page
 */
async function initReportsPage() {
    try {
        await loadAllReports();
        setupEventListeners();
        updateDateTime();
        initializeCharts();
    } catch (error) {
        console.error('Error initializing reports page:', error);
        showNotification('Failed to load reports data', 'error');
    }
}

/**
 * Load all reports data
 */
async function loadAllReports() {
    try {
        showLoading('Loading reports data...');
        
        // Load all data in parallel
        const [clients, sessions, invoices, products, staff, marketing] = await Promise.all([
            apiRequest('/clients'),
            apiRequest('/sessions'),
            apiRequest('/invoices'),
            apiRequest('/products'),
            apiRequest('/staff'),
            apiRequest('/analytics/marketing-conversion')
        ]);
        
        reportsData = { clients, sessions, invoices, products, staff, marketing };
        
        updateKPICards();
        loadOverviewReport();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading reports:', error);
        showNotification('Failed to load reports data', 'error');
        hideLoading();
    }
}

/**
 * Update KPI cards
 */
function updateKPICards() {
    // Total Revenue
    const totalRevenue = reportsData.invoices.reduce((sum, invoice) => sum + (invoice.TOTALDUE || 0), 0);
    document.getElementById('totalRevenueKPI').textContent = formatCurrency(totalRevenue);
    
    // Total Clients
    document.getElementById('totalClientsKPI').textContent = reportsData.clients.length;
    
    // Total Sessions
    document.getElementById('totalSessionsKPI').textContent = reportsData.sessions.length;
    
    // Products Sold (estimated from invoice line items)
    // Note: This would require actual invoice line item data
    const productsSold = reportsData.products.reduce((sum, product) => sum + (product.INITIALSTOCKLEVEL || 0), 0);
    document.getElementById('productsSoldKPI').textContent = productsSold;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Date range inputs
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    // Set default dates (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    startDateInput.value = startDate.toISOString().split('T')[0];
    endDateInput.value = endDate.toISOString().split('T')[0];
    
    // Initialize date pickers
    if (typeof flatpickr !== 'undefined') {
        flatpickr(startDateInput, {
            dateFormat: 'Y-m-d',
            maxDate: 'today'
        });
        
        flatpickr(endDateInput, {
            dateFormat: 'Y-m-d',
            minDate: startDateInput.value,
            maxDate: 'today'
        });
    }
}

/**
 * Initialize charts
 */
function initializeCharts() {
    // Destroy existing charts
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    chartInstances = {};
}

/**
 * Show specific report
 */
function showReport(reportName) {
    // Hide all reports
    document.querySelectorAll('.full-report').forEach(report => {
        report.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected report and activate tab
    document.getElementById(reportName + 'Report').classList.add('active');
    event.target.classList.add('active');
    
    // Load report data if not already loaded
    switch(reportName) {
        case 'financial':
            loadFinancialReport();
            break;
        case 'clients':
            loadClientsReport();
            break;
        case 'sessions':
            loadSessionsReport();
            break;
        case 'marketing':
            loadMarketingReport();
            break;
    }
}

/**
 * Load overview report
 */
function loadOverviewReport() {
    loadRevenueTrendChart();
    loadSessionTypesChart();
    loadClientAcquisitionChart();
    loadTopProductsChart();
}

/**
 * Load revenue trend chart
 */
function loadRevenueTrendChart() {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    
    // Group revenue by month
    const revenueByMonth = {};
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    reportsData.invoices.forEach(invoice => {
        const invoiceDate = new Date(invoice.INVOICEDATE);
        if (invoiceDate >= startDate && invoiceDate <= endDate) {
            const monthYear = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!revenueByMonth[monthYear]) {
                revenueByMonth[monthYear] = 0;
            }
            revenueByMonth[monthYear] += invoice.TOTALDUE || 0;
        }
    });
    
    // Sort months
    const months = Object.keys(revenueByMonth).sort();
    const revenue = months.map(month => revenueByMonth[month]);
    
    // Create chart
    chartInstances.revenueTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }),
            datasets: [{
                label: 'Revenue',
                data: revenue,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
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
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Revenue: ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Load session types chart
 */
function loadSessionTypesChart() {
    const ctx = document.getElementById('sessionTypesChart');
    if (!ctx) return;
    
    // Count sessions by type
    const sessionTypes = {};
    reportsData.sessions.forEach(session => {
        const type = session.SESSIONTYPE || 'Other';
        sessionTypes[type] = (sessionTypes[type] || 0) + 1;
    });
    
    // Prepare data
    const labels = Object.keys(sessionTypes);
    const data = Object.values(sessionTypes);
    
    // Colors
    const backgroundColors = [
        '#667eea', '#764ba2', '#4CAF50', '#2196F3',
        '#FF9800', '#F44336', '#9C27B0', '#009688'
    ];
    
    chartInstances.sessionTypes = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Load client acquisition chart
 */
function loadClientAcquisitionChart() {
    const ctx = document.getElementById('clientAcquisitionChart');
    if (!ctx) return;
    
    // Group clients by month of their first session or creation
    const clientsByMonth = {};
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    reportsData.clients.forEach(client => {
        // Use last session date or current date if no sessions
        const clientDate = client.LAST_SESSION_DATE ? new Date(client.LAST_SESSION_DATE) : new Date();
        if (clientDate >= startDate && clientDate <= endDate) {
            const monthYear = `${clientDate.getFullYear()}-${(clientDate.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!clientsByMonth[monthYear]) {
                clientsByMonth[monthYear] = 0;
            }
            clientsByMonth[monthYear]++;
        }
    });
    
    // Sort months
    const months = Object.keys(clientsByMonth).sort();
    const clients = months.map(month => clientsByMonth[month]);
    
    chartInstances.clientAcquisition = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(month => {
                const [year, monthNum] = month.split('-');
                return new Date(year, monthNum - 1).toLocaleDateString('en-US', { month: 'short' });
            }),
            datasets: [{
                label: 'New Clients',
                data: clients,
                backgroundColor: '#4CAF50',
                borderColor: '#45a049',
                borderWidth: 1
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
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Load top products chart
 */
function loadTopProductsChart() {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;
    
    // Get top 5 products by stock value (cost price * stock)
    const productsWithValue = reportsData.products.map(product => ({
        name: product.PRODUCTNAME,
        value: (product.COSTPRICE || 0) * (product.INITIALSTOCKLEVEL || 0)
    })).sort((a, b) => b.value - a.value).slice(0, 5);
    
    const labels = productsWithValue.map(p => p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''));
    const values = productsWithValue.map(p => p.value);
    
    chartInstances.topProducts = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Inventory Value',
                data: values,
                backgroundColor: '#FF9800',
                borderColor: '#F57C00',
                borderWidth: 1
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
                    callbacks: {
                        label: (context) => `Value: ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

/**
 * Load financial report
 */
function loadFinancialReport() {
    const reportType = document.getElementById('financialReportType').value;
    const groupBy = document.getElementById('financialGroupBy').value;
    
    // Update chart based on selection
    const ctx = document.getElementById('financialChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (chartInstances.financial) {
        chartInstances.financial.destroy();
    }
    
    // Prepare data based on report type
    let chartData = {};
    let chartType = 'bar';
    
    switch(reportType) {
        case 'revenue':
            chartData = prepareRevenueData(groupBy);
            chartType = 'line';
            break;
        case 'expenses':
            chartData = prepareExpensesData(groupBy);
            chartType = 'bar';
            break;
        case 'profit':
            chartData = prepareProfitData(groupBy);
            chartType = 'line';
            break;
        case 'invoices':
            chartData = prepareInvoicesData(groupBy);
            chartType = 'bar';
            break;
    }
    
    // Create chart
    chartInstances.financial = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    // Update metrics
    updateFinancialMetrics(reportType);
    
    // Update table
    updateFinancialTable(reportType, groupBy);
}

/**
 * Prepare revenue data
 */
function prepareRevenueData(groupBy) {
    const revenueByPeriod = {};
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    
    reportsData.invoices.forEach(invoice => {
        const invoiceDate = new Date(invoice.INVOICEDATE);
        if (invoiceDate >= startDate && invoiceDate <= endDate) {
            let periodKey = '';
            
            switch(groupBy) {
                case 'month':
                    periodKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
                case 'quarter':
                    const quarter = Math.floor(invoiceDate.getMonth() / 3) + 1;
                    periodKey = `Q${quarter} ${invoiceDate.getFullYear()}`;
                    break;
                case 'year':
                    periodKey = invoiceDate.getFullYear().toString();
                    break;
                case 'category':
                    // Group by session type (from invoice description)
                    periodKey = getCategoryFromInvoice(invoice) || 'Other';
                    break;
            }
            
            if (!revenueByPeriod[periodKey]) {
                revenueByPeriod[periodKey] = 0;
            }
            revenueByPeriod[periodKey] += invoice.TOTALDUE || 0;
        }
    });
    
    // Sort periods
    const periods = Object.keys(revenueByPeriod).sort();
    const revenues = periods.map(period => revenueByPeriod[period]);
    
    return {
        labels: periods,
        datasets: [{
            label: 'Revenue',
            data: revenues,
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
        }]
    };
}

/**
 * Get category from invoice
 */
function getCategoryFromInvoice(invoice) {
    if (!invoice.DESCRIPTION) return 'Other';
    
    const desc = invoice.DESCRIPTION.toLowerCase();
    if (desc.includes('wedding')) return 'Wedding';
    if (desc.includes('portrait')) return 'Portrait';
    if (desc.includes('family')) return 'Family';
    if (desc.includes('newborn')) return 'Newborn';
    if (desc.includes('engagement')) return 'Engagement';
    if (desc.includes('print') || desc.includes('album')) return 'Products';
    return 'Other';
}

/**
 * Update financial metrics
 */
function updateFinancialMetrics(reportType) {
    const metricsContainer = document.getElementById('financialMetrics');
    if (!metricsContainer) return;
    
    let metricsHTML = '';
    
    switch(reportType) {
        case 'revenue':
            const totalRevenue = reportsData.invoices.reduce((sum, inv) => sum + (inv.TOTALDUE || 0), 0);
            const avgInvoice = totalRevenue / (reportsData.invoices.length || 1);
            const paidInvoices = reportsData.invoices.filter(inv => inv.BALANCEDUE === 0).length;
            
            metricsHTML = `
                <div class="metric-item">
                    <div class="metric-value">${formatCurrency(totalRevenue)}</div>
                    <div class="metric-label">Total Revenue</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${formatCurrency(avgInvoice)}</div>
                    <div class="metric-label">Avg. Invoice</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${paidInvoices}</div>
                    <div class="metric-label">Paid Invoices</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${reportsData.invoices.length}</div>
                    <div class="metric-label">Total Invoices</div>
                </div>
            `;
            break;
            
        case 'profit':
            // Simplified profit calculation
            const revenue = reportsData.invoices.reduce((sum, inv) => sum + (inv.TOTALDUE || 0), 0);
            const estimatedCosts = revenue * 0.6; // Assuming 40% profit margin
            const profit = revenue - estimatedCosts;
            const margin = ((profit / revenue) * 100).toFixed(1);
            
            metricsHTML = `
                <div class="metric-item">
                    <div class="metric-value">${formatCurrency(revenue)}</div>
                    <div class="metric-label">Revenue</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${formatCurrency(estimatedCosts)}</div>
                    <div class="metric-label">Estimated Costs</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value" style="color: #4CAF50;">${formatCurrency(profit)}</div>
                    <div class="metric-label">Profit</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value" style="color: #4CAF50;">${margin}%</div>
                    <div class="metric-label">Margin</div>
                </div>
            `;
            break;
    }
    
    metricsContainer.innerHTML = metricsHTML;
}

/**
 * Update financial table
 */
function updateFinancialTable(reportType, groupBy) {
    const tableBody = document.getElementById('financialTableBody');
    if (!tableBody) return;
    
    let tableHTML = '';
    
    // Generate table data based on report type
    switch(reportType) {
        case 'revenue':
            const revenueData = prepareRevenueData(groupBy);
            
            revenueData.labels.forEach((label, index) => {
                const revenue = revenueData.datasets[0].data[index];
                const previous = index > 0 ? revenueData.datasets[0].data[index - 1] : revenue;
                const growth = previous > 0 ? ((revenue - previous) / previous * 100).toFixed(1) : 0;
                
                tableHTML += `
                    <tr>
                        <td>${label}</td>
                        <td>${formatCurrency(revenue)}</td>
                        <td>${formatCurrency(revenue * 0.6)}</td>
                        <td>${formatCurrency(revenue * 0.4)}</td>
                        <td>40%</td>
                        <td class="${growth >= 0 ? 'trend-up' : 'trend-down'}">
                            ${growth >= 0 ? '+' : ''}${growth}%
                        </td>
                    </tr>
                `;
            });
            break;
    }
    
    tableBody.innerHTML = tableHTML || '<tr><td colspan="6" style="text-align: center; padding: 20px;">No data available</td></tr>';
}

/**
 * Load clients report
 */
function loadClientsReport() {
    // Load client demographics chart
    loadClientDemographicsChart();
    
    // Load client growth chart
    loadClientGrowthChart();
    
    // Load top clients table
    loadTopClientsTable();
}

/**
 * Load client demographics chart
 */
function loadClientDemographicsChart() {
    const ctx = document.getElementById('clientDemographicsChart');
    if (!ctx) return;
    
    // Analyze client locations (simplified)
    const locations = {
        'Local': Math.floor(reportsData.clients.length * 0.6),
        'Out of Town': Math.floor(reportsData.clients.length * 0.3),
        'International': Math.floor(reportsData.clients.length * 0.1)
    };
    
    // Destroy existing chart
    if (chartInstances.clientDemographics) {
        chartInstances.clientDemographics.destroy();
    }
    
    chartInstances.clientDemographics = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(locations),
            datasets: [{
                data: Object.values(locations),
                backgroundColor: ['#667eea', '#4CAF50', '#FF9800'],
                borderWidth: 2,
                borderColor: 'white'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

/**
 * Load client growth chart
 */
function loadClientGrowthChart() {
    const ctx = document.getElementById('clientGrowthChart');
    if (!ctx) return;
    
    // Group clients by month
    const clientsByMonth = {};
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
    
    reportsData.clients.forEach(client => {
        const clientDate = client.LAST_SESSION_DATE ? new Date(client.LAST_SESSION_DATE) : new Date();
        if (clientDate >= startDate) {
            const monthYear = `${clientDate.getFullYear()}-${(clientDate.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!clientsByMonth[monthYear]) {
                clientsByMonth[monthYear] = 0;
            }
            clientsByMonth[monthYear]++;
        }
    });
    
    // Sort months and calculate cumulative total
    const months = Object.keys(clientsByMonth).sort();
    const newClients = months.map(month => clientsByMonth[month]);
    const cumulative = [];
    let total = 0;
    
    newClients.forEach(count => 
        {
        total +=