// ============================================
// SESSION MANAGEMENT SCRIPT
// ============================================

// Global variables
let sessions = [];
let clients = [];
let staff = [];
let filteredSessions = [];
let currentView = 'list';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let listPage = 1;
let listPageSize = 10;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
});

// Initialize page
async function initializePage() {
    try {
        // Initialize Flatpickr for date range
        flatpickr("#filterDateRange", {
            mode: "range",
            dateFormat: "Y-m-d",
            onChange: function(selectedDates, dateStr, instance) {
                if (selectedDates.length === 2) {
                    filterSessions();
                }
            }
        });

        // Load initial data
        await Promise.all([
            loadSessions(),
            loadClients(),
            loadStaff()
        ]);

        // Setup filters
        populateFilters();
        
        // Render initial view
        switchView('list');
        
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Error initializing page', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Session form submit
    document.getElementById('sessionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveSession();
    });

    // Load more on scroll
    window.addEventListener('scroll', handleScroll);
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

// Load sessions from API
async function loadSessions() {
    try {
        showLoading();
        const response = await fetch('/api/sessions');
        if (!response.ok) throw new Error('Failed to load sessions');
        
        sessions = await response.json();
        filteredSessions = [...sessions];
        
        renderSessionsList();
        renderCalendar();
        renderWeekView();
        
    } catch (error) {
        console.error('Error loading sessions:', error);
        showNotification('Failed to load sessions', 'error');
        document.getElementById('sessionsTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    Failed to load sessions. Please try again.
                </td>
            </tr>
        `;
    } finally {
        hideLoading();
    }
}

// Load clients for dropdown
async function loadClients() {
    try {
        const response = await fetch('/api/clients');
        if (!response.ok) throw new Error('Failed to load clients');
        
        clients = await response.json();
        populateClientDropdown();
        
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

// Load staff for photographer selection
async function loadStaff() {
    try {
        const response = await fetch('/api/staff');
        if (!response.ok) throw new Error('Failed to load staff');
        
        staff = await response.json();
        populateStaffDropdown();
        populatePhotographerList();
        
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

// Render sessions list view
function renderSessionsList() {
    const tbody = document.getElementById('sessionsTableBody');
    
    if (filteredSessions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No sessions found</p>
                    <p class="subtext">Try adjusting your filters or book a new session</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }

    const startIndex = (listPage - 1) * listPageSize;
    const endIndex = startIndex + listPageSize;
    const pageSessions = filteredSessions.slice(startIndex, endIndex);

    let html = '';
    
    pageSessions.forEach(session => {
        const sessionDate = new Date(session.SESSIONDATE);
        const startTime = session.SESSIONSTARTTIME ? session.SESSIONSTARTTIME.substring(0, 5) : 'N/A';
        const endTime = session.SESSIONENDTIME ? session.SESSIONENDTIME.substring(0, 5) : 'N/A';
        
        const statusClass = getSessionStatusClass(session.SESSIONDATE, session.SESSIONENDTIME);
        const statusText = getSessionStatusText(session.SESSIONDATE, session.SESSIONENDTIME);
        const typeClass = getSessionTypeClass(session.SESSIONTYPE);
        
        html += `
            <tr>
                <td>
                    <div class="session-info">
                        <strong>${session.SESSIONTYPE || 'N/A'}</strong>
                        <span class="session-type-badge ${typeClass}">
                            ${session.SESSIONTYPE || 'N/A'}
                        </span>
                        <span class="session-time">
                            <i class="far fa-clock"></i> ${startTime} - ${endTime}
                        </span>
                    </div>
                </td>
                <td>
                    <div class="client-info">
                        <strong>${session.CLIENT_NAME || 'No client'}</strong>
                        <small>${session.CLIENT_PHONE || ''}</small>
                    </div>
                </td>
                <td>
                    <div class="date-info">
                        <strong>${formatDate(session.SESSIONDATE)}</strong>
                        <small>${startTime} - ${endTime}</small>
                    </div>
                </td>
                <td>
                    <div class="session-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${session.LOCATION || 'Studio A'}</span>
                    </div>
                </td>
                <td>
                    <div class="session-assignments">
                        ${getAssignmentBadges(session.SESSIONID)}
                    </div>
                </td>
                <td>
                    <span class="session-status ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="viewSessionDetails('${session.SESSIONID}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="editSession('${session.SESSIONID}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteSession('${session.SESSIONID}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    updatePagination();
}

// Render calendar view
function renderCalendar() {
    const calendarType = document.getElementById('calendarType').value;
    const title = document.getElementById('calendarTitle');
    const grid = document.getElementById('calendarGrid');
    
    if (calendarType === 'month') {
        renderMonthCalendar();
    } else {
        renderWeekCalendar();
    }
}

// Render month calendar
function renderMonthCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Update title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarTitle').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    // Create header
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let calendarHTML = '';
    
    // Add day headers
    daysOfWeek.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startDay; i++) {
        calendarHTML += `<div class="calendar-day-cell empty"></div>`;
    }
    
    // Add day cells
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(currentYear, currentMonth, day);
        const isToday = cellDate.getTime() === today.getTime();
        const daySessions = getSessionsForDate(cellDate);
        
        let cellClass = 'calendar-day-cell';
        if (isToday) cellClass += ' today';
        
        calendarHTML += `
            <div class="${cellClass}" data-date="${formatDateForAPI(cellDate)}">
                <div class="day-number">${day}</div>
                ${daySessions.map(session => `
                    <div class="calendar-session-item" 
                         onclick="viewSessionDetails('${session.SESSIONID}')"
                         style="border-left-color: ${getSessionTypeColor(session.SESSIONTYPE)}">
                        <strong>${session.CLIENT_NAME?.split(' ')[0] || 'Client'}</strong>
                        <small>${session.SESSIONSTARTTIME?.substring(0, 5) || ''}</small>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    document.getElementById('calendarGrid').innerHTML = calendarHTML;
}

// Render week view
function renderWeekView() {
    const weekView = document.getElementById('weekView');
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start from Sunday
    
    let html = '';
    
    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        
        const daySessions = getSessionsForDate(day);
        const isToday = day.toDateString() === today.toDateString();
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="calendar-header">
                    <div class="calendar-date">
                        ${dayName}<br>
                        <strong>${day.getDate()}</strong> ${day.toLocaleString('default', { month: 'short' })}
                    </div>
                    <div class="calendar-count">${daySessions.length}</div>
                </div>
                <div class="calendar-sessions">
                    ${daySessions.length > 0 ? 
                        daySessions.map(session => `
                            <div class="calendar-session" onclick="viewSessionDetails('${session.SESSIONID}')">
                                <h5>${session.CLIENT_NAME || 'No Client'}</h5>
                                <p>${session.SESSIONTYPE || 'Session'}</p>
                                <p><i class="far fa-clock"></i> ${session.SESSIONSTARTTIME?.substring(0, 5) || ''} - ${session.SESSIONENDTIME?.substring(0, 5) || ''}</p>
                                <p><i class="fas fa-map-marker-alt"></i> ${session.LOCATION || 'Studio'}</p>
                            </div>
                        `).join('') : 
                        '<div class="no-sessions">No sessions scheduled</div>'
                    }
                </div>
            </div>
        `;
    }
    
    weekView.innerHTML = html;
}

// ============================================
// FILTER FUNCTIONS
// ============================================

// Filter sessions based on criteria
function filterSessions() {
    const typeFilter = document.getElementById('filterType').value;
    const statusFilter = document.getElementById('filterStatus').value;
    const dateRange = document.getElementById('filterDateRange').value;
    const photographerFilter = document.getElementById('filterPhotographer').value;
    
    filteredSessions = sessions.filter(session => {
        // Type filter
        if (typeFilter && session.SESSIONTYPE !== typeFilter) return false;
        
        // Status filter
        if (statusFilter) {
            const status = getSessionStatus(session.SESSIONDATE, session.SESSIONENDTIME);
            if (status !== statusFilter) return false;
        }
        
        // Date range filter
        if (dateRange) {
            const [startStr, endStr] = dateRange.split(' to ');
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);
            const sessionDate = new Date(session.SESSIONDATE);
            
            if (sessionDate < startDate || sessionDate > endDate) return false;
        }
        
        // Photographer filter
        if (photographerFilter) {
            // Check if session has this photographer assigned
            const assignments = getSessionAssignments(session.SESSIONID);
            if (!assignments.includes(photographerFilter)) return false;
        }
        
        return true;
    });
    
    // Reset to page 1
    listPage = 1;
    
    // Re-render current view
    if (currentView === 'list') {
        renderSessionsList();
    } else if (currentView === 'calendar') {
        renderCalendar();
    } else if (currentView === 'week') {
        renderWeekView();
    }
}

// Populate filter dropdowns
function populateFilters() {
    populatePhotographerFilter();
}

// Populate photographer filter
function populatePhotographerFilter() {
    const select = document.getElementById('filterPhotographer');
    const photographers = [...new Set(staff.map(s => s.STAFFEMAIL))];
    
    photographers.forEach(email => {
        const staffMember = staff.find(s => s.STAFFEMAIL === email);
        const option = document.createElement('option');
        option.value = email;
        option.textContent = `${staffMember?.FIRSTNAME} ${staffMember?.LASTNAME}`;
        select.appendChild(option);
    });
}

// ============================================
// MODAL FUNCTIONS
// ============================================

// Open add session modal
function openAddSessionModal() {
    resetSessionForm();
    document.getElementById('sessionModalTitle').textContent = 'Book New Session';
    document.getElementById('sessionModal').style.display = 'flex';
}

// Open edit session modal
async function editSession(sessionId) {
    try {
        const session = sessions.find(s => s.SESSIONID === sessionId);
        if (!session) throw new Error('Session not found');
        
        // Fetch session assignments
        const assignments = await getSessionAssignments(sessionId);
        
        // Populate form
        document.getElementById('sessionId').value = session.SESSIONID;
        document.getElementById('sessionClient').value = session.CLIENTEMAIL || '';
        document.getElementById('sessionType').value = session.SESSIONTYPE || '';
        document.getElementById('sessionDate').value = formatDateForInput(session.SESSIONDATE);
        document.getElementById('sessionStartTime').value = session.SESSIONSTARTTIME?.substring(0, 5) || '';
        document.getElementById('sessionEndTime').value = session.SESSIONENDTIME?.substring(0, 5) || '';
        document.getElementById('sessionLocation').value = session.LOCATION || '';
        document.getElementById('sessionPackage').value = session.PACKAGENAME || '';
        document.getElementById('sessionFee').value = session.SESSIONFEE || '';
        document.getElementById('depositPaid').value = session.DEPOSITPAID || '0';
        document.getElementById('sessionNotes').value = session.NOTES || '';
        
        // Select assigned photographers
        const photographerCards = document.querySelectorAll('.photographer-card');
        photographerCards.forEach(card => {
            const email = card.dataset.email;
            if (assignments.includes(email)) {
                card.classList.add('selected');
                const roleSelect = card.querySelector('.role-select');
                if (roleSelect) {
                    const assignment = assignments.find(a => a.STAFFEMAIL === email);
                    roleSelect.value = assignment?.ROLE || 'Photographer';
                }
            } else {
                card.classList.remove('selected');
            }
        });
        
        document.getElementById('sessionModalTitle').textContent = 'Edit Session';
        document.getElementById('sessionModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error editing session:', error);
        showNotification('Failed to load session details', 'error');
    }
}

// Close session modal
function closeSessionModal() {
    document.getElementById('sessionModal').style.display = 'none';
}

// Save session (create or update)
async function saveSession() {
    try {
        const form = document.getElementById('sessionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const sessionId = document.getElementById('sessionId').value;
        const isEdit = !!sessionId;
        
        // Get selected photographers
        const selectedPhotographers = [];
        document.querySelectorAll('.photographer-card.selected').forEach(card => {
            const email = card.dataset.email;
            const role = card.querySelector('.role-select')?.value || 'Photographer';
            selectedPhotographers.push({ email, role });
        });
        
        const sessionData = {
            sessionId: sessionId || `SESS${Date.now()}`,
            sessionType: document.getElementById('sessionType').value,
            sessionDate: document.getElementById('sessionDate').value,
            sessionStartTime: document.getElementById('sessionStartTime').value + ':00',
            sessionEndTime: document.getElementById('sessionEndTime').value + ':00',
            location: document.getElementById('sessionLocation').value,
            packageName: document.getElementById('sessionPackage').value,
            sessionFee: parseFloat(document.getElementById('sessionFee').value),
            notes: document.getElementById('sessionNotes').value,
            clientEmail: document.getElementById('sessionClient').value,
            depositPaid: parseFloat(document.getElementById('depositPaid').value) || 0
        };
        
        // Save session
        const endpoint = isEdit ? `/api/sessions/${sessionId}` : '/api/sessions';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });
        
        if (!response.ok) throw new Error('Failed to save session');
        
        // Save assignments if photographers selected
        if (selectedPhotographers.length > 0) {
            await saveSessionAssignments(sessionData.sessionId, selectedPhotographers);
        }
        
        showNotification(`Session ${isEdit ? 'updated' : 'created'} successfully`, 'success');
        closeSessionModal();
        await loadSessions(); // Reload data
        
    } catch (error) {
        console.error('Error saving session:', error);
        showNotification('Failed to save session', 'error');
    }
}

// View session details
async function viewSessionDetails(sessionId) {
    try {
        const session = sessions.find(s => s.SESSIONID === sessionId);
        if (!session) throw new Error('Session not found');
        
        // Fetch assignments
        const assignments = await getSessionAssignments(sessionId);
        
        const content = document.getElementById('sessionDetailsContent');
        const sessionDate = new Date(session.SESSIONDATE);
        const startTime = session.SESSIONSTARTTIME?.substring(0, 5) || '';
        const endTime = session.SESSIONENDTIME?.substring(0, 5) || '';
        const statusClass = getSessionStatusClass(session.SESSIONDATE, session.SESSIONENDTIME);
        const statusText = getSessionStatusText(session.SESSIONDATE, session.SESSIONENDTIME);
        
        content.innerHTML = `
            <div class="session-details-header">
                <div class="session-type-badge ${getSessionTypeClass(session.SESSIONTYPE)}">
                    ${session.SESSIONTYPE}
                </div>
                <div class="session-status ${statusClass}">${statusText}</div>
            </div>
            
            <div class="details-grid">
                <div class="detail-item">
                    <label><i class="far fa-calendar"></i> Date</label>
                    <p>${formatDate(session.SESSIONDATE)}</p>
                </div>
                <div class="detail-item">
                    <label><i class="far fa-clock"></i> Time</label>
                    <p>${startTime} - ${endTime}</p>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-map-marker-alt"></i> Location</label>
                    <p>${session.LOCATION || 'Not specified'}</p>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-gift"></i> Package</label>
                    <p>${session.PACKAGENAME || 'Not specified'}</p>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-dollar-sign"></i> Fee</label>
                    <p>$${parseFloat(session.SESSIONFEE || 0).toFixed(2)}</p>
                </div>
                <div class="detail-item">
                    <label><i class="fas fa-money-bill-wave"></i> Deposit</label>
                    <p>$${parseFloat(session.DEPOSITPAID || 0).toFixed(2)}</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Client</h4>
                <div class="client-card">
                    <strong>${session.CLIENT_NAME || 'No client assigned'}</strong>
                    <p>${session.CLIENT_PHONE || ''}</p>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-user-tie"></i> Assigned Staff</h4>
                ${assignments.length > 0 ? 
                    assignments.map(a => `
                        <div class="staff-card">
                            <div class="staff-info">
                                <div class="staff-avatar">
                                    ${a.FIRSTNAME?.charAt(0)}${a.LASTNAME?.charAt(0)}
                                </div>
                                <div>
                                    <strong>${a.FIRSTNAME} ${a.LASTNAME}</strong>
                                    <p>${a.ROLE || 'Photographer'}</p>
                                </div>
                            </div>
                        </div>
                    `).join('') : 
                    '<p>No staff assigned</p>'
                }
            </div>
            
            ${session.NOTES ? `
                <div class="detail-section">
                    <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                    <div class="notes-box">${session.NOTES}</div>
                </div>
            ` : ''}
        `;
        
        document.getElementById('sessionDetailsModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error viewing session details:', error);
        showNotification('Failed to load session details', 'error');
    }
}

// Close session details modal
function closeSessionDetailsModal() {
    document.getElementById('sessionDetailsModal').style.display = 'none';
}

// Edit session from details
function editSessionFromDetails() {
    const sessionId = document.getElementById('sessionDetailsModal').dataset.sessionId;
    closeSessionDetailsModal();
    editSession(sessionId);
}

// Reset session form
function resetSessionForm() {
    document.getElementById('sessionForm').reset();
    document.getElementById('sessionId').value = '';
    document.querySelectorAll('.photographer-card').forEach(card => {
        card.classList.remove('selected');
        const roleSelect = card.querySelector('.role-select');
        if (roleSelect) roleSelect.value = 'Photographer';
    });
}

// ============================================
// ASSIGNMENT FUNCTIONS
// ============================================

// Get session assignments
async function getSessionAssignments(sessionId) {
    try {
        const response = await fetch(`/api/sessions/${sessionId}/assignments`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Error fetching assignments:', error);
        return [];
    }
}

// Save session assignments
async function saveSessionAssignments(sessionId, assignments) {
    try {
        // First, delete existing assignments
        await fetch(`/api/sessions/${sessionId}/assignments`, {
            method: 'DELETE'
        });
        
        // Then add new assignments
        for (const assignment of assignments) {
            await fetch(`/api/sessions/${sessionId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    staffEmail: assignment.email,
                    role: assignment.role
                })
            });
        }
    } catch (error) {
        console.error('Error saving assignments:', error);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Switch between views
function switchView(view) {
    currentView = view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide views
    document.getElementById('listView').style.display = 'none';
    document.getElementById('calendarView').style.display = 'none';
    document.getElementById('weekView').style.display = 'none';
    
    if (view === 'list') {
        document.getElementById('listView').style.display = 'block';
        renderSessionsList();
    } else if (view === 'calendar') {
        document.getElementById('calendarView').style.display = 'block';
        renderCalendar();
    } else if (view === 'week') {
        document.getElementById('weekView').style.display = 'block';
        renderWeekView();
    }
}

// Change calendar month
function changeCalendarMonth(delta) {
    if (delta === 0) {
        currentMonth = new Date().getMonth();
        currentYear = new Date().getFullYear();
    } else {
        currentMonth += delta;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
    renderCalendar();
}

// Change page for list view
function changePage(delta, view) {
    if (view === 'list') {
        const totalPages = Math.ceil(filteredSessions.length / listPageSize);
        const newPage = listPage + delta;
        
        if (newPage >= 1 && newPage <= totalPages) {
            listPage = newPage;
            renderSessionsList();
        }
    }
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredSessions.length / listPageSize);
    const prevBtn = document.getElementById('prevBtnList');
    const nextBtn = document.getElementById('nextBtnList');
    const pageInfo = document.getElementById('pageInfoList');
    
    prevBtn.disabled = listPage <= 1;
    nextBtn.disabled = listPage >= totalPages;
    pageInfo.textContent = `Page ${listPage} of ${totalPages || 1}`;
}

// Get sessions for specific date
function getSessionsForDate(date) {
    const dateStr = formatDateForAPI(date);
    return filteredSessions.filter(session => {
        const sessionDate = formatDateForAPI(new Date(session.SESSIONDATE));
        return sessionDate === dateStr;
    });
}

// Get session status
function getSessionStatus(sessionDate, sessionEndTime) {
    const now = new Date();
    const sessionStart = new Date(sessionDate);
    const sessionEnd = sessionEndTime ? new Date(sessionDate + 'T' + sessionEndTime) : null;
    
    if (sessionEnd && now > sessionEnd) return 'completed';
    if (now >= sessionStart && (!sessionEnd || now <= sessionEnd)) return 'inprogress';
    if (now < sessionStart) return 'upcoming';
    return 'unknown';
}

// Get session status class
function getSessionStatusClass(sessionDate, sessionEndTime) {
    const status = getSessionStatus(sessionDate, sessionEndTime);
    return `status-${status}`;
}

// Get session status text
function getSessionStatusText(sessionDate, sessionEndTime) {
    const status = getSessionStatus(sessionDate, sessionEndTime);
    return status.charAt(0).toUpperCase() + status.slice(1);
}

// Get session type class
function getSessionTypeClass(type) {
    const typeMap = {
        'Wedding': 'type-wedding',
        'Portrait': 'type-portrait',
        'Family': 'type-family',
        'Newborn': 'type-newborn',
        'Engagement': 'type-engagement',
        'Maternity': 'type-newborn',
        'Commercial': 'type-portrait',
        'Event': 'type-wedding'
    };
    return typeMap[type] || 'type-portrait';
}

// Get session type color
function getSessionTypeColor(type) {
    const colorMap = {
        'Wedding': '#9C27B0',
        'Portrait': '#2196F3',
        'Family': '#4CAF50',
        'Newborn': '#FFC107',
        'Engagement': '#FF5722',
        'Maternity': '#FF9800',
        'Commercial': '#3F51B5',
        'Event': '#795548'
    };
    return colorMap[type] || '#667eea';
}

// Get assignment badges for a session
function getAssignmentBadges(sessionId) {
    // This would normally fetch from API
    // For now, return placeholder
    return `
        <span class="assignment-badge">Photographer</span>
        <span class="assignment-badge">Assistant</span>
    `;
}

// Populate client dropdown
function populateClientDropdown() {
    const select = document.getElementById('sessionClient');
    select.innerHTML = '<option value="">Select Client</option>';
    
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.CLIENTEMAIL;
        option.textContent = `${client.FIRSTNAME} ${client.LASTNAME} (${client.CLIENTEMAIL})`;
        select.appendChild(option);
    });
}

// Populate staff dropdown
function populateStaffDropdown() {
    // For other dropdowns if needed
}

// Populate photographer list
function populatePhotographerList() {
    const container = document.getElementById('photographerList');
    container.innerHTML = '';
    
    staff.forEach(member => {
        const div = document.createElement('div');
        div.className = 'photographer-card';
        div.dataset.email = member.STAFFEMAIL;
        div.onclick = function() {
            this.classList.toggle('selected');
        };
        
        div.innerHTML = `
            <div class="photographer-info">
                <div class="photographer-avatar">
                    ${member.FIRSTNAME?.charAt(0)}${member.LASTNAME?.charAt(0)}
                </div>
                <div>
                    <div class="photographer-name">${member.FIRSTNAME} ${member.LASTNAME}</div>
                    <div class="photographer-role">${member.ROLE}</div>
                </div>
            </div>
            <div class="role-selection">
                <label>Role</label>
                <select class="role-select" onclick="event.stopPropagation()">
                    <option value="Photographer">Photographer</option>
                    <option value="Assistant">Assistant</option>
                    <option value="Second Shooter">Second Shooter</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Stylist">Stylist</option>
                </select>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Delete session
async function deleteSession(sessionId) {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete session');
        
        showNotification('Session deleted successfully', 'success');
        await loadSessions();
        
    } catch (error) {
        console.error('Error deleting session:', error);
        showNotification('Failed to delete session', 'error');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format date for input
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Format date for API
function formatDateForAPI(date) {
    return date.toISOString().split('T')[0];
}

// Show loading state
function showLoading() {
    document.getElementById('sessionsTableBody').innerHTML = `
        <tr class="loading-row">
            <td colspan="7">
                <div class="spinner"></div>
                <p>Loading sessions...</p>
            </td>
        </tr>
    `;
}

// Hide loading state
function hideLoading() {
    // Loading row will be replaced by actual content
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Handle scroll for infinite loading
function handleScroll() {
    if (currentView !== 'list') return;
    
    const table = document.querySelector('.clients-container');
    const scrollPosition = window.innerHeight + window.scrollY;
    const tableBottom = table.offsetTop + table.offsetHeight;
    
    if (scrollPosition >= tableBottom - 100) {
        const totalPages = Math.ceil(filteredSessions.length / listPageSize);
        if (listPage < totalPages) {
            changePage(1, 'list');
        }
    }
}

// Initialize calendar on page load
window.onload = function() {
    // Set today's date as default for new sessions
    document.getElementById('sessionDate').valueAsDate = new Date();
    
    // Set default times
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 2 hours from now
    
    document.getElementById('sessionStartTime').value = 
        startTime.toTimeString().substring(0, 5);
    document.getElementById('sessionEndTime').value = 
        endTime.toTimeString().substring(0, 5);
};