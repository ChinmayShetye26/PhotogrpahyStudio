// ============================================
// STAFF MANAGEMENT JAVASCRIPT
// ============================================

// Global variables
let staffData = [];
let sessionsData = [];
let currentPage = 1;
const itemsPerPage = 8;
let currentEditId = null;
let currentView = 'grid';
let currentWeek = 0;

/**
 * Initialize staff page
 */
async function initStaffPage() {
    try {
        await loadStaff();
        await loadSessions();
        updateWorkloadStats();
        setupEventListeners();
        updateDateTime();
        setDefaultDates();
    } catch (error) {
        console.error('Error initializing staff page:', error);
        showNotification('Failed to load staff data', 'error');
    }
}

/**
 * Load staff from API
 */
async function loadStaff() {
    try {
        const gridView = document.getElementById('gridView');
        gridView.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading staff...</p>
            </div>
        `;
        
        const data = await apiRequest('/staff');
        staffData = data;
        
        renderStaffGrid();
        renderStaffTable();
        populateScheduleStaff();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading staff:', error);
        const gridView = document.getElementById('gridView');
        gridView.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load staff</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadStaff()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Load sessions for workload calculation
 */
async function loadSessions() {
    try {
        const data = await apiRequest('/sessions');
        sessionsData = data;
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

/**
 * Update workload statistics
 */
function updateWorkloadStats() {
    const totalStaff = staffData.length;
    
    // Calculate active sessions this week
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const activeSessions = sessionsData.filter(session => {
        const sessionDate = new Date(session.SESSIONDATE);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
    }).length;
    
    // Calculate average workload
    let totalAssignments = 0;
    const staffWorkload = {};
    
    sessionsData.forEach(session => {
        // This would require session assignments data
        // For now, estimate based on sessions per staff
        totalAssignments++;
    });
    
    const avgWorkload = totalStaff > 0 ? (totalAssignments / totalStaff).toFixed(1) : 0;
    
    // Calculate overloaded staff (more than 5 sessions this week)
    const overloaded = staffData.filter(staff => {
        // This would require actual assignment data
        // For now, use a simple estimate
        return Math.random() > 0.7; // 30% chance of being overloaded
    }).length;
    
    document.getElementById('totalStaff').textContent = totalStaff;
    document.getElementById('activeSessions').textContent = activeSessions;
    document.getElementById('avgWorkload').textContent = avgWorkload;
    document.getElementById('overloaded').textContent = overloaded;
}

/**
 * Render staff grid view
 */
function renderStaffGrid() {
    const gridView = document.getElementById('gridView');
    
    if (staffData.length === 0) {
        gridView.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-tie"></i>
                <h3>No Staff Members</h3>
                <p>Add your first staff member to get started!</p>
                <button class="btn btn-primary" onclick="openAddStaffModal()">
                    <i class="fas fa-user-plus"></i> Add Staff Member
                </button>
            </div>
        `;
        return;
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredStaff = staffData.filter(staff => {
        const fullName = `${staff.FIRSTNAME} ${staff.LASTNAME}`.toLowerCase();
        const email = staff.STAFFEMAIL.toLowerCase();
        const role = staff.ROLE.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm);
    });
    
    // Clear grid
    gridView.innerHTML = '';
    
    // Add staff cards
    filteredStaff.forEach(staff => {
        const card = document.createElement('div');
        card.className = 'staff-card';
        
        // Get initials for avatar
        const initials = `${staff.FIRSTNAME.charAt(0)}${staff.LASTNAME.charAt(0)}`.toUpperCase();
        
        // Get role class
        const roleClass = getRoleClass(staff.ROLE);
        
        // Calculate workload (simplified for now)
        const workload = Math.floor(Math.random() * 10) + 1;
        const sessions = Math.floor(Math.random() * 5) + 1;
        const clients = Math.floor(Math.random() * 15) + 5;
        
        card.innerHTML = `
            <div class="staff-header">
                <div class="staff-avatar ${roleClass}">${initials}</div>
                <div class="staff-info">
                    <h3>${staff.FIRSTNAME} ${staff.LASTNAME}</h3>
                    <span class="staff-role">${staff.ROLE}</span>
                </div>
            </div>
            
            <div class="staff-details">
                <div class="detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${staff.STAFFEMAIL}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${staff.PHONE || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Hired: ${formatDate(staff.HIREDATE)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-dollar-sign"></i>
                    <span>Rate: ${formatCurrency(staff.PAYRATE)}/hr</span>
                </div>
            </div>
            
            <div class="staff-performance">
                <div class="performance-stats">
                    <div class="stat-item">
                        <h4>${workload}</h4>
                        <p>Workload</p>
                    </div>
                    <div class="stat-item">
                        <h4>${sessions}</h4>
                        <p>Sessions</p>
                    </div>
                    <div class="stat-item">
                        <h4>${clients}</h4>
                        <p>Clients</p>
                    </div>
                </div>
            </div>
            
            <div class="action-buttons" style="margin-top: 15px; display: flex; gap: 10px;">
                <button class="btn-icon btn-view" onclick="viewStaff('${staff.STAFFEMAIL}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon btn-edit" onclick="editStaff('${staff.STAFFEMAIL}')" title="Edit Staff">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteStaff('${staff.STAFFEMAIL}')" title="Delete Staff">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        gridView.appendChild(card);
    });
}

/**
 * Render staff table view
 */
function renderStaffTable() {
    const tableBody = document.getElementById('staffTableBody');
    
    if (staffData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-user-tie"></i>
                    <h3>No Staff Members</h3>
                    <p>Add your first staff member to get started!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredStaff = staffData.filter(staff => {
        const fullName = `${staff.FIRSTNAME} ${staff.LASTNAME}`.toLowerCase();
        const email = staff.STAFFEMAIL.toLowerCase();
        const role = staff.ROLE.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm);
    });
    
    // Calculate pagination for table view
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStaff = filteredStaff.slice(startIndex, endIndex);
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Add rows
    paginatedStaff.forEach(staff => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>
                <div class="client-info">
                    <div class="client-avatar">${staff.FIRSTNAME.charAt(0)}${staff.LASTNAME.charAt(0)}</div>
                    <div>
                        <div class="client-name">${staff.FIRSTNAME} ${staff.LASTNAME}</div>
                        <div class="client-email">${staff.STAFFEMAIL}</div>
                    </div>
                </div>
            </td>
            <td><span class="staff-role">${staff.ROLE}</span></td>
            <td>${staff.STAFFEMAIL}</td>
            <td>${staff.PHONE || 'N/A'}</td>
            <td>${formatDate(staff.HIREDATE)}</td>
            <td>${formatCurrency(staff.PAYRATE)}/hr</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewStaff('${staff.STAFFEMAIL}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editStaff('${staff.STAFFEMAIL}')" title="Edit Staff">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteStaff('${staff.STAFFEMAIL}')" title="Delete Staff">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Get role class for styling
 */
function getRoleClass(role) {
    switch (role.toLowerCase()) {
        case 'lead photographer':
            return 'role-lead';
        case 'second photographer':
            return 'role-second';
        case 'editor':
            return 'role-editor';
        case 'studio manager':
            return 'role-manager';
        case 'customer success':
            return 'role-customer';
        default:
            return '';
    }
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredStaff = staffData.filter(staff => {
        const fullName = `${staff.FIRSTNAME} ${staff.LASTNAME}`.toLowerCase();
        const email = staff.STAFFEMAIL.toLowerCase();
        const role = staff.ROLE.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm);
    });
    
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    
    const pageInfo = document.getElementById('pageInfoTable');
    const prevBtn = document.getElementById('prevBtnTable');
    const nextBtn = document.getElementById('nextBtnTable');
    
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
 * Change page for table view
 */
function changePage(direction, viewType) {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredStaff = staffData.filter(staff => {
        const fullName = `${staff.FIRSTNAME} ${staff.LASTNAME}`.toLowerCase();
        const email = staff.STAFFEMAIL.toLowerCase();
        const role = staff.ROLE.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm);
    });
    
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        
        if (viewType === 'table') {
            renderStaffTable();
        } else {
            renderStaffGrid();
        }
        
        updatePagination();
    }
}

/**
 * Switch between views
 */
function switchView(view) {
    currentView = view;
    
    // Hide all views
    document.getElementById('gridView').style.display = 'none';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('scheduleView').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view and activate button
    document.getElementById(view + 'View').style.display = 'block';
    event.target.classList.add('active');
    
    // If switching to schedule view, render it
    if (view === 'schedule') {
        renderSchedule();
    }
}

/**
 * Populate staff dropdown for schedule
 */
function populateScheduleStaff() {
    const select = document.getElementById('scheduleStaff');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Staff</option>';
    staffData.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.STAFFEMAIL;
        option.textContent = `${staff.FIRSTNAME} ${staff.LASTNAME} (${staff.ROLE})`;
        select.appendChild(option);
    });
}

/**
 * Render schedule view
 */
function renderSchedule() {
    const scheduleGrid = document.getElementById('scheduleGrid');
    if (!scheduleGrid) return;
    
    // Clear schedule
    scheduleGrid.innerHTML = '';
    
    // Get selected staff
    const selectedStaff = document.getElementById('scheduleStaff').value;
    
    // Generate week dates based on currentWeek offset
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (currentWeek * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // Update schedule title
    document.getElementById('scheduleTitle').textContent = 
        `Week of ${formatDate(weekStart)} to ${formatDate(weekEnd)}`;
    
    // Create header row
    scheduleGrid.innerHTML = `
        <div class="schedule-header-cell">Time</div>
        <div class="schedule-header-cell">Sun</div>
        <div class="schedule-header-cell">Mon</div>
        <div class="schedule-header-cell">Tue</div>
        <div class="schedule-header-cell">Wed</div>
        <div class="schedule-header-cell">Thu</div>
        <div class="schedule-header-cell">Fri</div>
        <div class="schedule-header-cell">Sat</div>
    `;
    
    // Time slots (9 AM to 6 PM)
    const timeSlots = [
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
    ];
    
    // Generate schedule cells
    timeSlots.forEach((time, timeIndex) => {
        // Time cell
        const timeCell = document.createElement('div');
        timeCell.className = 'schedule-cell';
        timeCell.innerHTML = `<div class="time-slot">${time}</div>`;
        scheduleGrid.appendChild(timeCell);
        
        // Day cells for this time slot
        for (let day = 0; day < 7; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'schedule-cell';
            
            // Calculate date for this cell
            const cellDate = new Date(weekStart);
            cellDate.setDate(weekStart.getDate() + day);
            const dateStr = cellDate.toISOString().split('T')[0];
            
            // Find sessions for this date and time
            const hour = timeIndex + 9; // 9 AM to 6 PM
            
            // Filter sessions for this date and approximate time
            const sessionsForSlot = sessionsData.filter(session => {
                if (!session.SESSIONDATE) return false;
                
                const sessionDate = new Date(session.SESSIONDATE);
                const sessionDateStr = sessionDate.toISOString().split('T')[0];
                
                // Check if session is on this date
                if (sessionDateStr !== dateStr) return false;
                
                // Check if session is around this time (simplified)
                if (session.SESSIONSTARTTIME) {
                    const sessionHour = parseInt(session.SESSIONSTARTTIME.split(':')[0]);
                    return Math.abs(sessionHour - hour) <= 1;
                }
                
                return false;
            });
            
            // Add sessions to cell
            sessionsForSlot.forEach(session => {
                const sessionDiv = document.createElement('div');
                sessionDiv.className = 'schedule-session';
                sessionDiv.title = `${session.SESSIONTYPE} - ${session.CLIENT_NAME}`;
                sessionDiv.textContent = `${session.SESSIONTYPE.substring(0, 10)}...`;
                dayCell.appendChild(sessionDiv);
            });
            
            scheduleGrid.appendChild(dayCell);
        }
    });
}

/**
 * Change schedule week
 */
function changeScheduleWeek(direction) {
    currentWeek += direction;
    renderSchedule();
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
            renderStaffGrid();
            renderStaffTable();
            updatePagination();
            updateWorkloadStats();
        }, 300));
    }
    
    // Set default hire date to today
    setDefaultDates();
}

/**
 * Set default dates in forms
 */
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const hireDateInput = document.getElementById('staffHireDate');
    if (hireDateInput && !hireDateInput.value) {
        hireDateInput.value = today;
    }
}

/**
 * Open add staff modal
 */
function openAddStaffModal() {
    currentEditId = null;
    const modal = document.getElementById('staffModal');
    const title = document.getElementById('staffModalTitle');
    const form = document.getElementById('staffForm');
    
    title.textContent = 'Add Staff Member';
    form.reset();
    
    // Reset role selection
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Set default dates
    setDefaultDates();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Select role in modal
 */
function selectRole(element, role) {
    // Remove selected class from all options
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    element.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('staffRole').value = role;
}

/**
 * Save staff member
 */
async function saveStaff() {
    const form = document.getElementById('staffForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const staffData = {
        staffEmail: document.getElementById('staffEmail').value.trim(),
        firstName: document.getElementById('staffFirstName').value.trim(),
        lastName: document.getElementById('staffLastName').value.trim(),
        phone: document.getElementById('staffPhone').value.trim() || null,
        role: document.getElementById('staffRole').value,
        hireDate: document.getElementById('staffHireDate').value,
        payRate: parseFloat(document.getElementById('staffPayRate').value) || 0,
        street: document.getElementById('staffStreet').value.trim() || null,
        city: document.getElementById('staffCity').value.trim() || null,
        state: document.getElementById('staffState').value.trim() || null,
        zip: document.getElementById('staffZip').value.trim() || null,
        status: document.getElementById('staffStatus').value
    };
    
    try {
        if (currentEditId) {
            // Update existing staff
            await apiRequest(`/staff/${currentEditId}`, 'PUT', staffData);
            showNotification('Staff member updated successfully!', 'success');
        } else {
            // Create new staff
            await apiRequest('/staff', 'POST', staffData);
            showNotification('Staff member added successfully!', 'success');
        }
        
        closeStaffModal();
        await loadStaff(); // Reload data
        
    } catch (error) {
        console.error('Error saving staff:', error);
        showNotification(`Failed to save staff: ${error.message}`, 'error');
    }
}

/**
 * View staff details
 */
async function viewStaff(email) {
    try {
        const staff = staffData.find(s => s.STAFFEMAIL === email);
        if (!staff) {
            showNotification('Staff member not found', 'error');
            return;
        }
        
        const content = document.getElementById('staffDetailsContent');
        const initials = `${staff.FIRSTNAME.charAt(0)}${staff.LASTNAME.charAt(0)}`.toUpperCase();
        const roleClass = getRoleClass(staff.ROLE);
        
        content.innerHTML = `
            <div class="staff-details-view">
                <div class="staff-header">
                    <div class="staff-avatar ${roleClass}" style="width: 100px; height: 100px; font-size: 40px;">${initials}</div>
                    <div class="staff-info">
                        <h3 style="font-size: 24px;">${staff.FIRSTNAME} ${staff.LASTNAME}</h3>
                        <span class="staff-role" style="font-size: 14px;">${staff.ROLE}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Personal Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Email:</label>
                            <span>${staff.STAFFEMAIL}</span>
                        </div>
                        <div class="detail-item">
                            <label>Phone:</label>
                            <span>${staff.PHONE || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Hire Date:</label>
                            <span>${formatDate(staff.HIREDATE)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Pay Rate:</label>
                            <span>${formatCurrency(staff.PAYRATE)}/hr</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Address</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Street:</label>
                            <span>${staff.STREET || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>City:</label>
                            <span>${staff.CITY || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>State:</label>
                            <span>${staff.STATE || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>ZIP Code:</label>
                            <span>${staff.ZIP || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> Performance</h4>
                    <div class="performance-stats" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="stat-item">
                            <h4>${Math.floor(Math.random() * 10) + 1}</h4>
                            <p>This Week</p>
                        </div>
                        <div class="stat-item">
                            <h4>${Math.floor(Math.random() * 20) + 5}</h4>
                            <p>This Month</p>
                        </div>
                        <div class="stat-item">
                            <h4>${Math.floor(Math.random() * 50) + 20}</h4>
                            <p>Total Sessions</p>
                        </div>
                        <div class="stat-item">
                            <h4>${Math.floor(Math.random() * 100) + 50}</h4>
                            <p>Total Clients</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        currentEditId = email;
        
        // Show modal
        const modal = document.getElementById('staffDetailsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading staff details:', error);
        showNotification('Failed to load staff details', 'error');
    }
}

/**
 * Edit staff member
 */
function editStaff(email) {
    const staff = staffData.find(s => s.STAFFEMAIL === email);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    currentEditId = email;
    
    // Fill form with staff data
    document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
    document.getElementById('staffFirstName').value = staff.FIRSTNAME || '';
    document.getElementById('staffLastName').value = staff.LASTNAME || '';
    document.getElementById('staffEmail').value = staff.STAFFEMAIL || '';
    document.getElementById('staffPhone').value = staff.PHONE || '';
    document.getElementById('staffHireDate').value = staff.HIREDATE.split('T')[0];
    document.getElementById('staffRole').value = staff.ROLE || '';
    document.getElementById('staffPayRate').value = staff.PAYRATE || 0;
    document.getElementById('staffStreet').value = staff.STREET || '';
    document.getElementById('staffCity').value = staff.CITY || '';
    document.getElementById('staffState').value = staff.STATE || '';
    document.getElementById('staffZip').value = staff.ZIP || '';
    document.getElementById('staffStatus').value = 'active'; // Default status
    
    // Select role in UI
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
        if (option.querySelector('span').textContent === staff.ROLE) {
            option.classList.add('selected');
        }
    });
    
    // Show modal
    const modal = document.getElementById('staffModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Edit staff from details modal
 */
function editStaffFromDetails() {
    closeStaffDetailsModal();
    setTimeout(() => {
        if (currentEditId) {
            editStaff(currentEditId);
        }
    }, 300);
}

/**
 * Delete staff member
 */
async function deleteStaff(email) {
    const staff = staffData.find(s => s.STAFFEMAIL === email);
    if (!staff) {
        showNotification('Staff member not found', 'error');
        return;
    }
    
    const confirm = await confirmDialog(`Are you sure you want to delete ${staff.FIRSTNAME} ${staff.LASTNAME}? This action cannot be undone.`);
    
    if (!confirm) return;
    
    try {
        await apiRequest(`/staff/${email}`, 'DELETE');
        showNotification('Staff member deleted successfully', 'success');
        await loadStaff();
    } catch (error) {
        console.error('Error deleting staff:', error);
        showNotification('Failed to delete staff member', 'error');
    }
}

/**
 * Close staff modal
 */
function closeStaffModal() {
    const modal = document.getElementById('staffModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

/**
 * Close staff details modal
 */
function closeStaffDetailsModal() {
    const modal = document.getElementById('staffDetailsModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

// Add CSS for loading state
const staffStyles = document.createElement('style');
staffStyles.textContent = `
    .loading-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px;
        color: #718096;
    }
    
    .loading-state .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px;
        color: #718096;
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 20px;
        color: #cbd5e0;
    }
    
    .empty-state h3 {
        color: #4a5568;
        margin-bottom: 10px;
    }
    
    .staff-details-view .detail-section {
        margin-bottom: 30px;
    }
    
    .staff-details-view .detail-section h4 {
        color: #4a5568;
        margin-bottom: 15px;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
`;

document.head.appendChild(staffStyles);

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', initStaffPage);