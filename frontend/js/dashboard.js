// ============================================
// DASHBOARD FUNCTIONALITY
// ============================================

// Chart instances
let revenueChart = null;
let sessionsChart = null;

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Load dashboard statistics
        const stats = await apiRequest('/analytics/dashboard');
        updateStats(stats);
        
        // Load recent sessions
        const sessions = await apiRequest('/sessions');
        updateRecentSessions(sessions);
        
        // Load recent invoices
        const invoices = await apiRequest('/invoices');
        updateRecentInvoices(invoices);
        
        // Load and render charts
        await loadCharts();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

/**
 * Update statistics cards
 */
function updateStats(stats) {
    // Update total clients
    const totalClients = document.getElementById('totalClients');
    if (totalClients) {
        totalClients.textContent = stats.totalClients || 0;
    }
    
    // Update upcoming sessions
    const upcomingSessions = document.getElementById('upcomingSessions');
    if (upcomingSessions) {
        upcomingSessions.textContent = stats.upcomingSessions || 0;
    }
    
    // Update monthly revenue
    const monthlyRevenue = document.getElementById('monthlyRevenue');
    if (monthlyRevenue) {
        monthlyRevenue.textContent = formatCurrency(stats.monthlyRevenue || 0);
    }
    
    // Update outstanding balance
    const outstandingBalance = document.getElementById('outstandingBalance');
    if (outstandingBalance) {
        outstandingBalance.textContent = formatCurrency(stats.outstandingBalance || 0);
    }
}

/**
 * Update recent sessions list
 */
function updateRecentSessions(sessions) {
    const container = document.getElementById('recentSessionsList');
    const countElement = document.getElementById('recentSessionsCount');
    
    if (!container) return;
    
    // Sort by date (most recent first)
    const recentSessions = sessions
        .sort((a, b) => new Date(b.SESSIONDATE) - new Date(a.SESSIONDATE))
        .slice(0, 5);
    
    // Update count
    if (countElement) {
        countElement.textContent = recentSessions.length;
    }
    
    // Clear loading message
    container.innerHTML = '';
    
    if (recentSessions.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent sessions</div>';
        return;
    }
    
    // Create session items
    recentSessions.forEach(session => {
        const sessionDate = new Date(session.SESSIONDATE);
        const now = new Date();
        const isToday = sessionDate.toDateString() === now.toDateString();
        const isUpcoming = sessionDate > now;
        
        let statusClass = 'past';
        let statusText = 'Completed';
        
        if (isToday) {
            statusClass = 'today';
            statusText = 'Today';
        } else if (isUpcoming) {
            statusClass = 'upcoming';
            statusText = 'Upcoming';
        }
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <i class="fas fa-camera"></i>
            <div class="activity-info">
                <h5>${session.CLIENT_NAME || 'Unknown Client'}</h5>
                <p>${formatDate(session.SESSIONDATE)} • ${session.SESSIONTYPE}</p>
                <span class="session-status ${statusClass}">${statusText}</span>
            </div>
        `;
        
        // Add click event to view session details
        item.style.cursor = 'pointer';
        item.onclick = () => viewSessionDetails(session.SESSIONID);
        
        container.appendChild(item);
    });
}

/**
 * Update recent invoices list
 */
function updateRecentInvoices(invoices) {
    const container = document.getElementById('recentInvoicesList');
    const countElement = document.getElementById('recentInvoicesCount');
    
    if (!container) return;
    
    // Sort by date (most recent first)
    const recentInvoices = invoices
        .sort((a, b) => new Date(b.INVOICEDATE) - new Date(a.INVOICEDATE))
        .slice(0, 5);
    
    // Update count
    if (countElement) {
        countElement.textContent = recentInvoices.length;
    }
    
    // Clear loading message
    container.innerHTML = '';
    
    if (recentInvoices.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent invoices</div>';
        return;
    }
    
    // Create invoice items
    recentInvoices.forEach(invoice => {
        const status = invoice.BALANCEDUE === 0 ? 'paid' : 'pending';
        const statusClass = invoice.BALANCEDUE === 0 ? 'success' : 'warning';
        const statusText = invoice.BALANCEDUE === 0 ? 'Paid' : 'Pending';
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <i class="fas fa-file-invoice-dollar"></i>
            <div class="activity-info">
                <h5>Invoice #${invoice.INVOICENUMBER}</h5>
                <p>${invoice.CLIENT_NAME} • ${formatCurrency(invoice.TOTALDUE)}</p>
                <span class="invoice-status ${statusClass}">${statusText}</span>
            </div>
        `;
        
        // Add click event to view invoice
        item.style.cursor = 'pointer';
        item.onclick = () => viewInvoiceDetails(invoice.INVOICENUMBER);
        
        container.appendChild(item);
    });
}

/**
 * View session details
 */
function viewSessionDetails(sessionId) {
    showNotification(`Viewing session #${sessionId}`, 'info');
    // In a real application, this would redirect to session details page
    // window.location.href = `session-details.html?id=${sessionId}`;
}

/**
 * View invoice details
 */
function viewInvoiceDetails(invoiceNumber) {
    showNotification(`Viewing invoice #${invoiceNumber}`, 'info');
    // In a real application, this would redirect to invoice details page
    // window.location.href = `invoice-details.html?id=${invoiceNumber}`;
}

/**
 * Load and render charts
 */
async function loadCharts() {
    try {
        // Load data for charts
        const sessions = await apiRequest('/sessions');
        const invoices = await apiRequest('/invoices');
        
        // Render charts
        renderRevenueChart(invoices);
        renderSessionsChart(sessions);
        
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

/**
 * Render revenue chart
 */
function renderRevenueChart(invoices) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Group invoices by month
    const revenueByMonth = {};
    invoices.forEach(invoice => {
        const date = new Date(invoice.INVOICEDATE);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!revenueByMonth[monthYear]) {
            revenueByMonth[monthYear] = 0;
        }
        revenueByMonth[monthYear] += invoice.PAYMENTRECEIVED;
    });
    
    // Sort months
    const months = Object.keys(revenueByMonth).sort();
    const revenue = months.map(month => revenueByMonth[month]);
    
    // Destroy existing chart
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    // Create new chart
    revenueChart = new Chart(ctx, {
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
 * Render sessions chart
 */
function renderSessionsChart(sessions) {
    const ctx = document.getElementById('sessionsChart');
    if (!ctx) return;
    
    // Count sessions by type
    const sessionTypes = {};
    sessions.forEach(session => {
        const type = session.SESSIONTYPE;
        sessionTypes[type] = (sessionTypes[type] || 0) + 1;
    });
    
    // Prepare data
    const labels = Object.keys(sessionTypes);
    const data = Object.values(sessionTypes);
    
    // Colors for pie chart
    const backgroundColors = [
        '#667eea', '#764ba2', '#4CAF50', '#2196F3',
        '#FF9800', '#F44336', '#9C27B0', '#009688'
    ];
    
    // Destroy existing chart
    if (sessionsChart) {
        sessionsChart.destroy();
    }
    
    // Create new chart
    sessionsChart = new Chart(ctx, {
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
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} sessions (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

/**
 * Update charts based on selected period
 */
function updateCharts() {
    const period = document.getElementById('chartPeriod').value;
    showNotification(`Updating charts for ${period} period...`, 'info');
    
    // Reload data and charts
    loadCharts();
}

/**
 * Refresh entire dashboard
 */
function refreshDashboard() {
    showNotification('Refreshing dashboard...', 'info');
    loadDashboardData();
}

/**
 * View all activities
 */
function viewAllActivities() {
    showNotification('Redirecting to activities page...', 'info');
    // In a real application, this would redirect to activities page
    // window.location.href = 'activities.html';
}

// Add CSS for status badges
const dashboardStyles = document.createElement('style');
dashboardStyles.textContent = `
    .session-status, .invoice-status {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        margin-top: 5px;
    }
    
    .session-status.past {
        background-color: #e9ecef;
        color: #6c757d;
    }
    
    .session-status.today {
        background-color: #fff3cd;
        color: #856404;
    }
    
    .session-status.upcoming {
        background-color: #d1ecf1;
        color: #0c5460;
    }
    
    .invoice-status.success {
        background-color: #d4edda;
        color: #155724;
    }
    
    .invoice-status.warning {
        background-color: #fff3cd;
        color: #856404;
    }
    
    .empty-state {
        text-align: center;
        padding: 30px;
        color: #6c757d;
        font-style: italic;
    }
    
    .activity-item {
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .activity-item:hover {
        transform: translateX(5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
`;

document.head.appendChild(dashboardStyles);

// Load dashboard data when page loads
document.addEventListener('DOMContentLoaded', loadDashboardData);