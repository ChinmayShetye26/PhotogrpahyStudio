// ============================================
// MAIN JAVASCRIPT FILE
// ============================================

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global State
let appState = {
    user: null,
    notifications: [],
    loading: false
};

// Utility Functions

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - success, error, warning, info
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${getNotificationIcon(type)}"></i>
        </div>
        <div class="notification-content">
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 300px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    return notification;
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

/**
 * Get notification color based on type
 */
function getNotificationColor(type) {
    const colors = {
        success: 'linear-gradient(135deg, #4CAF50, #45a049)',
        error: 'linear-gradient(135deg, #f44336, #d32f2f)',
        warning: 'linear-gradient(135deg, #ff9800, #f57c00)',
        info: 'linear-gradient(135deg, #2196F3, #1976D2)'
    };
    return colors[type] || colors.info;
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
    });
}

/**
 * Format time
 * @param {string} time - Time string (HH:MM)
 * @returns {string} Formatted time string
 */
function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Show loading spinner
 * @param {string} message - Loading message
 */
function showLoading(message = 'Loading...') {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'global-loading';
    loadingDiv.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        </div>
    `;
    
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
    `;
    
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
        .loading-spinner {
            text-align: center;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(spinnerStyle);
    document.body.appendChild(loadingDiv);
    appState.loading = true;
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    const loadingDiv = document.getElementById('global-loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
    appState.loading = false;
}

/**
 * Make API request with error handling
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request data
 * @returns {Promise} Promise with response data
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        showLoading('Processing request...');
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                error: `HTTP ${response.status}: ${response.statusText}`
            }));
            throw new Error(error.error || error.message || 'Request failed');
        }
        
        const responseData = await response.json();
        return responseData;
    } catch (error) {
        console.error('API Request Error:', error);
        showNotification(error.message, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

/**
 * Update current date and time
 */
function updateDateTime() {
    const now = new Date();
    const dateTimeElement = document.getElementById('currentDateTime');
    
    if (dateTimeElement) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

/**
 * Initialize application
 */
function initApp() {
    // Update date time every second
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .fade-in {
            animation: fadeIn 0.5s ease;
        }
        
        .notification {
            animation: slideInRight 0.3s ease;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0;
            margin-left: auto;
        }
        
        .notification-icon i {
            font-size: 20px;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-content p {
            margin: 0;
            font-size: 14px;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
    
    // Check API health on startup
    checkApiHealth();
}

/**
 * Check if API is running
 */
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ API is running');
        } else {
            showNotification('Backend API is not responding', 'warning');
        }
    } catch (error) {
        console.error('API Health Check Failed:', error);
        showNotification(
            'Cannot connect to backend server. Make sure the server is running on port 3000.',
            'error',
            10000
        );
    }
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Confirm dialog
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} User confirmation
 */
function confirmDialog(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay">
                <div class="dialog-content">
                    <div class="dialog-header">
                        <h4>Confirmation</h4>
                        <button class="dialog-close">&times;</button>
                    </div>
                    <div class="dialog-body">
                        <p>${message}</p>
                    </div>
                    <div class="dialog-footer">
                        <button class="btn btn-cancel">Cancel</button>
                        <button class="btn btn-confirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .confirm-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
            }
            .dialog-overlay {
                background: rgba(0, 0, 0, 0.5);
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .dialog-content {
                background: white;
                border-radius: 12px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                animation: fadeIn 0.3s ease;
            }
            .dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e9ecef;
            }
            .dialog-header h4 {
                margin: 0;
                color: #2d3748;
            }
            .dialog-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #718096;
            }
            .dialog-body {
                padding: 20px;
            }
            .dialog-body p {
                margin: 0;
                color: #4a5568;
                line-height: 1.5;
            }
            .dialog-footer {
                padding: 20px;
                border-top: 1px solid #e9ecef;
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
            .btn-cancel {
                background: #e9ecef;
                color: #4a5568;
            }
            .btn-confirm {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(dialog);
        
        // Handle events
        dialog.querySelector('.dialog-close').onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
        
        dialog.querySelector('.btn-cancel').onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
        
        dialog.querySelector('.btn-confirm').onclick = () => {
            document.body.removeChild(dialog);
            resolve(true);
        };
        
        // Close on overlay click
        dialog.querySelector('.dialog-overlay').onclick = (e) => {
            if (e.target === dialog.querySelector('.dialog-overlay')) {
                document.body.removeChild(dialog);
                resolve(false);
            }
        };
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE_URL,
        showNotification,
        formatCurrency,
        formatDate,
        formatTime,
        apiRequest,
        confirmDialog
    };
}