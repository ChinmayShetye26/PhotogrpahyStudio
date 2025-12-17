// ============================================
// CLIENTS MANAGEMENT JAVASCRIPT
// ============================================

// Global variables
let clientsData = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentEditId = null;
let staffList = [];

/**
 * Initialize clients page
 */
async function initClientsPage() {
    try {
        await loadClients();
        await loadStaff();
        setupEventListeners();
        updateDateTime();
    } catch (error) {
        console.error('Error initializing clients page:', error);
        showNotification('Failed to load clients data', 'error');
    }
}

/**
 * Load clients from API
 */
async function loadClients() {
    try {
        const tableBody = document.getElementById('clientsTableBody');
        tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7">
                    <div class="spinner"></div>
                    <p>Loading clients...</p>
                </td>
            </tr>
        `;
        
        const data = await apiRequest('/clients');
        clientsData = data;
        
        renderClientsTable();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading clients:', error);
        const tableBody = document.getElementById('clientsTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load clients</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="loadClients()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Load staff for manager dropdown
 */
async function loadStaff() {
    try {
        const data = await apiRequest('/staff');
        staffList = data;
        
        const managerSelect = document.getElementById('manager');
        if (managerSelect) {
            managerSelect.innerHTML = '<option value="">Select Manager</option>';
            staffList.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff.STAFFEMAIL;
                option.textContent = `${staff.FIRSTNAME} ${staff.LASTNAME} (${staff.ROLE})`;
                managerSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

/**
 * Render clients table
 */
function renderClientsTable() {
    const tableBody = document.getElementById('clientsTableBody');
    
    if (clientsData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h3>No Clients Found</h3>
                    <p>Get started by adding your first client!</p>
                    <button class="btn btn-primary" onclick="openAddClientModal()">
                        <i class="fas fa-user-plus"></i> Add New Client
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredClients = clientsData.filter(client => {
        const fullName = `${client.FIRSTNAME} ${client.LASTNAME}`.toLowerCase();
        const email = client.CLIENTEMAIL.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, endIndex);
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Add rows
    paginatedClients.forEach(client => {
        const row = document.createElement('tr');
        
        // Get initials for avatar
        const initials = `${client.FIRSTNAME.charAt(0)}${client.LASTNAME.charAt(0)}`.toUpperCase();
        
        // Determine status
        const lastSessionDate = client.LAST_SESSION_DATE ? new Date(client.LAST_SESSION_DATE) : null;
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        let status = 'active';
        let statusText = 'Active';
        
        if (!lastSessionDate) {
            status = 'inactive';
            statusText = 'New';
        } else if (lastSessionDate < sixMonthsAgo) {
            status = 'inactive';
            statusText = 'Inactive';
        }
        
        row.innerHTML = `
            <td>
                <div class="client-info">
                    <div class="client-avatar">${initials}</div>
                    <div>
                        <div class="client-name">${client.FIRSTNAME} ${client.LASTNAME}</div>
                        <div class="client-email">${client.CLIENTEMAIL}</div>
                    </div>
                </div>
            </td>
            <td>${client.PHONE || 'N/A'}</td>
            <td>${client.LEADSOURCE || 'N/A'}</td>
            <td>${client.MANAGER_NAME || 'Not Assigned'}</td>
            <td>${client.LAST_SESSION_DATE ? formatDate(client.LAST_SESSION_DATE) : 'No sessions'}</td>
            <td><span class="status-badge status-${status}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewClient('${client.CLIENTEMAIL}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editClient('${client.CLIENTEMAIL}')" title="Edit Client">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteClient('${client.CLIENTEMAIL}')" title="Delete Client">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredClients = clientsData.filter(client => {
        const fullName = `${client.FIRSTNAME} ${client.LASTNAME}`.toLowerCase();
        const email = client.CLIENTEMAIL.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
    
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
}

/**
 * Change page
 */
function changePage(direction) {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredClients = clientsData.filter(client => {
        const fullName = `${client.FIRSTNAME} ${client.LASTNAME}`.toLowerCase();
        const email = client.CLIENTEMAIL.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
    });
    
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderClientsTable();
        updatePagination();
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            renderClientsTable();
            updatePagination();
        }, 300));
    }
    
    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeClientModal();
            closeDetailsModal();
        }
    });
    
    // Close modals on outside click
    document.addEventListener('click', (e) => {
        const clientModal = document.getElementById('clientModal');
        const detailsModal = document.getElementById('clientDetailsModal');
        
        if (clientModal && clientModal.style.display === 'flex' && e.target === clientModal) {
            closeClientModal();
        }
        
        if (detailsModal && detailsModal.style.display === 'flex' && e.target === detailsModal) {
            closeDetailsModal();
        }
    });
}

/**
 * Open add client modal
 */
function openAddClientModal() {
    currentEditId = null;
    const modal = document.getElementById('clientModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('clientForm');
    
    title.textContent = 'Add New Client';
    form.reset();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Open edit client modal
 */
async function editClient(email) {
    try {
        const client = clientsData.find(c => c.CLIENTEMAIL === email);
        if (!client) {
            showNotification('Client not found', 'error');
            return;
        }
        
        currentEditId = email;
        
        // Fill form with client data
        document.getElementById('firstName').value = client.FIRSTNAME || '';
        document.getElementById('lastName').value = client.LASTNAME || '';
        document.getElementById('email').value = client.CLIENTEMAIL || '';
        document.getElementById('phone').value = client.PHONE || '';
        document.getElementById('street').value = client.STREET || '';
        document.getElementById('city').value = client.CITY || '';
        document.getElementById('state').value = client.STATE || '';
        document.getElementById('zip').value = client.ZIP || '';
        document.getElementById('leadSource').value = client.LEADSOURCE || '';
        document.getElementById('manager').value = client.MANAGEDBY_STAFFEMAIL || '';
        document.getElementById('clientId').value = client.CLIENTEMAIL;
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Edit Client';
        
        // Show modal
        const modal = document.getElementById('clientModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error editing client:', error);
        showNotification('Failed to load client data', 'error');
    }
}

/**
 * Save client (create or update)
 */
async function saveClient() {
    const form = document.getElementById('clientForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const clientData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        clientEmail: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim() || null,
        street: document.getElementById('street').value.trim() || null,
        city: document.getElementById('city').value.trim() || null,
        state: document.getElementById('state').value.trim() || null,
        zip: document.getElementById('zip').value.trim() || null,
        leadSource: document.getElementById('leadSource').value || null,
        managedByStaffEmail: document.getElementById('manager').value
    };
    
    try {
        if (currentEditId) {
            // Update existing client
            await apiRequest(`/clients/${currentEditId}`, 'PUT', clientData);
            showNotification('Client updated successfully!', 'success');
        } else {
            // Create new client
            await apiRequest('/clients', 'POST', clientData);
            showNotification('Client added successfully!', 'success');
        }
        
        closeClientModal();
        await loadClients(); // Reload data
        
    } catch (error) {
        console.error('Error saving client:', error);
        showNotification(`Failed to save client: ${error.message}`, 'error');
    }
}

/**
 * View client details
 */
async function viewClient(email) {
    try {
        const client = await apiRequest(`/clients/${email}`);
        
        const content = document.getElementById('clientDetailsContent');
        content.innerHTML = `
            <div class="client-details">
                <div class="detail-header">
                    <div class="detail-avatar">
                        ${client.FIRSTNAME.charAt(0)}${client.LASTNAME.charAt(0)}
                    </div>
                    <div class="detail-title">
                        <h3>${client.FIRSTNAME} ${client.LASTNAME}</h3>
                        <p>${client.CLIENTEMAIL}</p>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-address-card"></i> Contact Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Phone:</label>
                            <span>${client.PHONE || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Address:</label>
                            <span>${client.STREET || ''} ${client.CITY || ''} ${client.STATE || ''} ${client.ZIP || ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Client Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Lead Source:</label>
                            <span>${client.LEADSOURCE || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Assigned Manager:</label>
                            <span>${client.MANAGER_NAME || 'Not Assigned'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Last Session:</label>
                            <span>${client.LAST_SESSION_DATE ? formatDate(client.LAST_SESSION_DATE) : 'No sessions yet'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Member Since:</label>
                            <span>${client.LAST_SESSION_DATE ? formatDate(client.LAST_SESSION_DATE) : 'New Client'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-calendar-alt"></i> Recent Activity</h4>
                    <div class="activity-list">
                        <p>Loading recent activity...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Load recent sessions for this client
        await loadClientActivity(email);
        
        // Show modal
        const modal = document.getElementById('clientDetailsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading client details:', error);
        showNotification('Failed to load client details', 'error');
    }
}

/**
 * Load client activity (sessions)
 */
async function loadClientActivity(email) {
    try {
        const sessions = await apiRequest('/sessions');
        const clientSessions = sessions.filter(s => s.CLIENTEMAIL === email)
            .sort((a, b) => new Date(b.SESSIONDATE) - new Date(a.SESSIONDATE))
            .slice(0, 5);
        
        const activityList = document.querySelector('#clientDetailsModal .activity-list');
        
        if (clientSessions.length === 0) {
            activityList.innerHTML = '<p class="no-activity">No recent sessions</p>';
            return;
        }
        
        let html = '<div class="activity-items">';
        clientSessions.forEach(session => {
            html += `
                <div class="activity-item">
                    <i class="fas fa-camera"></i>
                    <div class="activity-content">
                        <strong>${session.SESSIONTYPE}</strong>
                        <p>${formatDate(session.SESSIONDATE)} • ${formatCurrency(session.SESSIONFEE)}</p>
                        <small>${session.LOCATION || 'Location not specified'}</small>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        activityList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading client activity:', error);
    }
}

/**
 * Edit client from details modal
 */
function editClientFromDetails() {
    closeDetailsModal();
    setTimeout(() => {
        if (currentEditId) {
            editClient(currentEditId);
        }
    }, 300);
}

/**
 * Delete client with confirmation
 */
async function deleteClient(email) {
    const confirm = await confirmDialog(`Are you sure you want to delete this client? This action cannot be undone.`);
    
    if (!confirm) return;
    
    try {
        await apiRequest(`/clients/${email}`, 'DELETE');
        showNotification('Client deleted successfully', 'success');
        await loadClients(); // Reload data
    } catch (error) {
        console.error('Error deleting client:', error);
        showNotification('Failed to delete client', 'error');
    }
}

/**
 * Close client modal
 */
function closeClientModal() {
    const modal = document.getElementById('clientModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

/**
 * Close details modal
 */
function closeDetailsModal() {
    const modal = document.getElementById('clientDetailsModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

// Add CSS for client details
const clientsStyles = document.createElement('style');
clientsStyles.textContent = `
    .client-details {
        padding: 10px;
    }
    
    .detail-header {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e9ecef;
    }
    
    .detail-avatar {
        width: 70px;
        height: 70px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 24px;
        font-weight: 600;
        margin-right: 20px;
    }
    
    .detail-title h3 {
        margin: 0 0 5px 0;
        color: #2d3748;
        font-size: 24px;
    }
    
    .detail-title p {
        margin: 0;
        color: #718096;
    }
    
    .detail-section {
        margin-bottom: 30px;
    }
    
    .detail-section h4 {
        color: #4a5568;
        margin-bottom: 15px;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }
    
    .detail-item {
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .detail-item label {
        display: block;
        font-size: 12px;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 5px;
    }
    
    .detail-item span {
        display: block;
        font-size: 16px;
        color: #2d3748;
        font-weight: 500;
    }
    
    .activity-items {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .activity-item {
        display: flex;
        align-items: flex-start;
        padding: 15px;
        margin-bottom: 10px;
        background: white;
        border-radius: 8px;
        border-left: 4px solid #667eea;
    }
    
    .activity-item i {
        font-size: 20px;
        color: #667eea;
        margin-right: 15px;
        margin-top: 3px;
    }
    
    .activity-content {
        flex: 1;
    }
    
    .activity-content strong {
        display: block;
        color: #2d3748;
        margin-bottom: 3px;
    }
    
    .activity-content p {
        margin: 0 0 5px 0;
        color: #718096;
        font-size: 14px;
    }
    
    .activity-content small {
        color: #a0aec0;
        font-size: 12px;
    }
    
    .no-activity {
        text-align: center;
        padding: 30px;
        color: #a0aec0;
        font-style: italic;
    }
`;

document.head.appendChild(clientsStyles);

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', initClientsPage);