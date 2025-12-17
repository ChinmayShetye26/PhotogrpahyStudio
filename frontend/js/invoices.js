// ============================================
// INVOICES MANAGEMENT JAVASCRIPT
// ============================================

// Global variables
let invoicesData = [];
let clientsList = [];
let productsList = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentEditId = null;

/**
 * Initialize invoices page
 */
async function initInvoicesPage() {
    try {
        await loadInvoices();
        await loadClients();
        await loadProducts();
        updateInvoiceStats();
        setupEventListeners();
        updateDateTime();
    } catch (error) {
        console.error('Error initializing invoices page:', error);
        showNotification('Failed to load invoices data', 'error');
    }
}

/**
 * Load invoices from API
 */
async function loadInvoices() {
    try {
        const tableBody = document.getElementById('invoicesTableBody');
        tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="8">
                    <div class="spinner"></div>
                    <p>Loading invoices...</p>
                </td>
            </tr>
        `;
        
        const data = await apiRequest('/invoices');
        invoicesData = data;
        
        renderInvoicesTable();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading invoices:', error);
        const tableBody = document.getElementById('invoicesTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>Failed to load invoices</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="loadInvoices()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Load clients for dropdown
 */
async function loadClients() {
    try {
        const data = await apiRequest('/clients');
        clientsList = data;
        
        const clientSelect = document.getElementById('invoiceClient');
        if (clientSelect) {
            clientSelect.innerHTML = '<option value="">Select Client</option>';
            clientsList.forEach(client => {
                const option = document.createElement('option');
                option.value = client.CLIENTEMAIL;
                option.textContent = `${client.FIRSTNAME} ${client.LASTNAME} (${client.CLIENTEMAIL})`;
                clientSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

/**
 * Load products for invoice items
 */
async function loadProducts() {
    try {
        const data = await apiRequest('/products');
        productsList = data;
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

/**
 * Update invoice statistics
 */
function updateInvoiceStats() {
    const totalInvoices = invoicesData.length;
    const totalRevenue = invoicesData.reduce((sum, inv) => sum + (inv.PAYMENTRECEIVED || 0), 0);
    const pendingInvoices = invoicesData.filter(inv => inv.BALANCEDUE > 0).length;
    const overdueAmount = invoicesData.reduce((sum, inv) => {
        if (inv.BALANCEDUEDATE) {
            const dueDate = new Date(inv.BALANCEDUEDATE);
            const today = new Date();
            if (dueDate < today && inv.BALANCEDUE > 0) {
                return sum + inv.BALANCEDUE;
            }
        }
        return sum;
    }, 0);
    
    document.getElementById('totalInvoices').textContent = totalInvoices;
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('pendingInvoices').textContent = pendingInvoices;
    document.getElementById('overdueAmount').textContent = formatCurrency(overdueAmount);
}

/**
 * Render invoices table
 */
function renderInvoicesTable() {
    const tableBody = document.getElementById('invoicesTableBody');
    
    if (invoicesData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <h3>No Invoices Found</h3>
                    <p>Create your first invoice to get started!</p>
                    <button class="btn btn-primary" onclick="openAddInvoiceModal()">
                        <i class="fas fa-file-invoice"></i> Create Invoice
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filteredInvoices = invoicesData.filter(invoice => {
        const clientName = invoice.CLIENT_NAME?.toLowerCase() || '';
        const invoiceNumber = invoice.INVOICENUMBER?.toString() || '';
        return clientName.includes(searchTerm) || invoiceNumber.includes(searchTerm);
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Add rows
    paginatedInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        
        // Determine status
        let status = 'draft';
        let statusText = 'Draft';
        let statusClass = 'status-draft';
        
        if (invoice.BALANCEDUE === 0) {
            status = 'paid';
            statusText = 'Paid';
            statusClass = 'status-paid';
        } else if (invoice.BALANCEDUEDATE) {
            const dueDate = new Date(invoice.BALANCEDUEDATE);
            const today = new Date();
            if (dueDate < today) {
                status = 'overdue';
                statusText = 'Overdue';
                statusClass = 'status-overdue';
            } else {
                status = 'pending';
                statusText = 'Pending';
                statusClass = 'status-pending';
            }
        }
        
        // Check if due date is in the past
        const dueDate = invoice.BALANCEDUEDATE ? new Date(invoice.BALANCEDUEDATE) : null;
        const today = new Date();
        const dueDateClass = dueDate && dueDate < today ? 'overdue' : '';
        
        row.innerHTML = `
            <td>
                <strong>INV-${invoice.INVOICENUMBER.toString().padStart(4, '0')}</strong>
                <div style="font-size: 12px; color: #718096;">${invoice.DESCRIPTION || 'No description'}</div>
            </td>
            <td>${invoice.CLIENT_NAME || 'Unknown Client'}</td>
            <td>${formatDate(invoice.INVOICEDATE)}</td>
            <td>
                <div class="invoice-amount">${formatCurrency(invoice.TOTALDUE)}</div>
            </td>
            <td>
                <div class="invoice-balance">${formatCurrency(invoice.BALANCEDUE)}</div>
            </td>
            <td>
                <div class="due-date ${dueDateClass}">
                    ${invoice.BALANCEDUEDATE ? formatDate(invoice.BALANCEDUEDATE) : 'Not set'}
                </div>
            </td>
            <td><span class="invoice-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewInvoice('${invoice.INVOICENUMBER}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editInvoice('${invoice.INVOICENUMBER}')" title="Edit Invoice">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteInvoice('${invoice.INVOICENUMBER}')" title="Delete Invoice">
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
    const filteredInvoices = invoicesData.filter(invoice => {
        const clientName = invoice.CLIENT_NAME?.toLowerCase() || '';
        const invoiceNumber = invoice.INVOICENUMBER?.toString() || '';
        return clientName.includes(searchTerm) || invoiceNumber.includes(searchTerm);
    });
    
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    
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
    const filteredInvoices = invoicesData.filter(invoice => {
        const clientName = invoice.CLIENT_NAME?.toLowerCase() || '';
        const invoiceNumber = invoice.INVOICENUMBER?.toString() || '';
        return clientName.includes(searchTerm) || invoiceNumber.includes(searchTerm);
    });
    
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderInvoicesTable();
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
            renderInvoicesTable();
            updatePagination();
            updateInvoiceStats();
        }, 300));
    }
    
    // Date inputs - set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    
    const invoiceDateInput = document.getElementById('invoiceDate');
    const dueDateInput = document.getElementById('dueDate');
    
    if (invoiceDateInput) invoiceDateInput.value = today;
    if (dueDateInput) dueDateInput.value = dueDateStr;
    
    // Generate invoice number
    generateInvoiceNumber();
    
    // Calculate initial totals
    calculateInvoiceTotals();
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber() {
    const nextNumber = invoicesData.length > 0 
        ? Math.max(...invoicesData.map(inv => inv.INVOICENUMBER)) + 1
        : 1001;
    
    document.getElementById('invoiceNumberDisplay').textContent = `INV-${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Open add invoice modal
 */
function openAddInvoiceModal() {
    currentEditId = null;
    const modal = document.getElementById('invoiceModal');
    const title = document.getElementById('invoiceModalTitle');
    const form = document.getElementById('invoiceForm');
    
    title.textContent = 'Create New Invoice';
    form.reset();
    
    // Reset items
    const itemsBody = document.getElementById('invoiceItemsBody');
    itemsBody.innerHTML = `
        <tr>
            <td>
                <select class="item-select" onchange="updateItemPrice(this)" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    <option value="">Select Product/Service</option>
                    <option value="session">Photo Session</option>
                    <option value="print">Photo Print</option>
                    <option value="album">Photo Album</option>
                    <option value="digital">Digital Files</option>
                    <option value="custom">Custom Service</option>
                </select>
                <input type="text" class="custom-description" placeholder="Custom description" style="display: none; width: 100%; margin-top: 5px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
            </td>
            <td><input type="number" class="item-quantity" min="1" value="1" onchange="calculateItemTotal(this)" style="width: 60px; padding: 8px; text-align: center;"></td>
            <td><input type="number" class="item-price" min="0" step="0.01" value="0" onchange="calculateItemTotal(this)" style="width: 100px; padding: 8px; text-align: center;"></td>
            <td class="item-total-amount">$0.00</td>
            <td>
                <button type="button" class="btn-icon btn-delete" onclick="removeInvoiceItem(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];
    
    document.getElementById('invoiceDate').value = today;
    document.getElementById('dueDate').value = dueDateStr;
    
    // Generate new invoice number
    generateInvoiceNumber();
    
    // Reset totals
    calculateInvoiceTotals();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Update client address when client is selected
 */
function updateClientAddress() {
    const clientEmail = document.getElementById('invoiceClient').value;
    const client = clientsList.find(c => c.CLIENTEMAIL === clientEmail);
    const addressDiv = document.getElementById('clientAddress');
    
    if (client) {
        const address = [];
        if (client.STREET) address.push(client.STREET);
        if (client.CITY) address.push(client.CITY);
        if (client.STATE) address.push(client.STATE);
        if (client.ZIP) address.push(client.ZIP);
        
        addressDiv.innerHTML = `
            <strong>${client.FIRSTNAME} ${client.LASTNAME}</strong><br>
            ${address.join(', ')}<br>
            ${client.PHONE || ''}<br>
            ${client.CLIENTEMAIL}
        `;
    } else {
        addressDiv.textContent = 'Select a client to view address';
    }
}

/**
 * Add invoice item row
 */
function addInvoiceItem() {
    const itemsBody = document.getElementById('invoiceItemsBody');
    const newRow = document.createElement('tr');
    
    newRow.innerHTML = `
        <td>
            <select class="item-select" onchange="updateItemPrice(this)" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <option value="">Select Product/Service</option>
                <option value="session">Photo Session</option>
                <option value="print">Photo Print</option>
                <option value="album">Photo Album</option>
                <option value="digital">Digital Files</option>
                <option value="custom">Custom Service</option>
            </select>
            <input type="text" class="custom-description" placeholder="Custom description" style="display: none; width: 100%; margin-top: 5px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
        </td>
        <td><input type="number" class="item-quantity" min="1" value="1" onchange="calculateItemTotal(this)" style="width: 60px; padding: 8px; text-align: center;"></td>
        <td><input type="number" class="item-price" min="0" step="0.01" value="0" onchange="calculateItemTotal(this)" style="width: 100px; padding: 8px; text-align: center;"></td>
        <td class="item-total-amount">$0.00</td>
        <td>
            <button type="button" class="btn-icon btn-delete" onclick="removeInvoiceItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    itemsBody.appendChild(newRow);
    calculateInvoiceTotals();
}

/**
 * Remove invoice item row
 */
function removeInvoiceItem(button) {
    const row = button.closest('tr');
    if (row && document.getElementById('invoiceItemsBody').children.length > 1) {
        row.remove();
        calculateInvoiceTotals();
    }
}

/**
 * Update item price based on selection
 */
function updateItemPrice(select) {
    const row = select.closest('tr');
    const priceInput = row.querySelector('.item-price');
    const customInput = row.querySelector('.custom-description');
    
    // Show/hide custom description
    if (select.value === 'custom') {
        customInput.style.display = 'block';
    } else {
        customInput.style.display = 'none';
    }
    
    // Set default prices based on selection
    let defaultPrice = 0;
    switch (select.value) {
        case 'session':
            defaultPrice = 300;
            break;
        case 'print':
            defaultPrice = 20;
            break;
        case 'album':
            defaultPrice = 200;
            break;
        case 'digital':
            defaultPrice = 150;
            break;
        default:
            defaultPrice = 0;
    }
    
    priceInput.value = defaultPrice;
    calculateItemTotal(priceInput);
}

/**
 * Calculate item total
 */
function calculateItemTotal(input) {
    const row = input.closest('tr');
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const total = quantity * price;
    
    const totalCell = row.querySelector('.item-total-amount');
    totalCell.textContent = formatCurrency(total);
    
    calculateInvoiceTotals();
}

/**
 * Calculate invoice totals
 */
function calculateInvoiceTotals() {
    const rows = document.querySelectorAll('#invoiceItemsBody tr');
    let subtotal = 0;
    
    rows.forEach(row => {
        const totalCell = row.querySelector('.item-total-amount');
        const totalText = totalCell.textContent.replace(/[^0-9.-]+/g, '');
        const total = parseFloat(totalText) || 0;
        subtotal += total;
    });
    
    const tax = subtotal * 0.08; // 8% tax
    const totalDue = subtotal + tax;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('taxAmount').textContent = formatCurrency(tax);
    document.getElementById('totalDue').textContent = formatCurrency(totalDue);
    
    // Update balance due
    updateBalance();
}

/**
 * Update balance due
 */
function updateBalance() {
    const totalDueText = document.getElementById('totalDue').textContent.replace(/[^0-9.-]+/g, '');
    const totalDue = parseFloat(totalDueText) || 0;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const balanceDue = Math.max(0, totalDue - amountPaid);
    
    document.getElementById('balanceDue').value = balanceDue.toFixed(2);
}

/**
 * Save invoice
 */
async function saveInvoice() {
    const form = document.getElementById('invoiceForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collect items
    const items = [];
    const rows = document.querySelectorAll('#invoiceItemsBody tr');
    rows.forEach(row => {
        const select = row.querySelector('.item-select');
        const descriptionInput = row.querySelector('.custom-description');
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        let description = '';
        if (select.value === 'custom' && descriptionInput.value) {
            description = descriptionInput.value;
        } else if (select.value) {
            description = select.options[select.selectedIndex].text;
        }
        
        if (description && quantity > 0 && price > 0) {
            items.push({
                description,
                quantity,
                price,
                total: quantity * price
            });
        }
    });
    
    if (items.length === 0) {
        showNotification('Please add at least one item to the invoice', 'warning');
        return;
    }
    
    const invoiceData = {
        invoiceNumber: parseInt(document.getElementById('invoiceNumberDisplay').textContent.split('-')[1]),
        invoiceDate: document.getElementById('invoiceDate').value,
        description: items.map(item => item.description).join(', '),
        subtotal: parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.-]+/g, '')) || 0,
        tax: parseFloat(document.getElementById('taxAmount').textContent.replace(/[^0-9.-]+/g, '')) || 0,
        totalDue: parseFloat(document.getElementById('totalDue').textContent.replace(/[^0-9.-]+/g, '')) || 0,
        balanceDue: parseFloat(document.getElementById('balanceDue').value) || 0,
        paymentReceived: parseFloat(document.getElementById('amountPaid').value) || 0,
        balanceDueDate: document.getElementById('dueDate').value,
        clientEmail: document.getElementById('invoiceClient').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        notes: document.getElementById('invoiceNotes').value,
        items: items
    };
    
    try {
        if (currentEditId) {
            // Update existing invoice
            await apiRequest(`/invoices/${currentEditId}`, 'PUT', invoiceData);
            showNotification('Invoice updated successfully!', 'success');
        } else {
            // Create new invoice
            await apiRequest('/invoices', 'POST', invoiceData);
            showNotification('Invoice created successfully!', 'success');
        }
        
        closeInvoiceModal();
        await loadInvoices(); // Reload data
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification(`Failed to save invoice: ${error.message}`, 'error');
    }
}

/**
 * View invoice details
 */
async function viewInvoice(invoiceNumber) {
    try {
        const invoice = await apiRequest(`/invoices/${invoiceNumber}/details`);
        
        const content = document.getElementById('invoiceDetailsContent');
        let itemsHtml = '';
        
        if (invoice.lineItems && invoice.lineItems.length > 0) {
            itemsHtml = `
                <table class="invoice-items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.lineItems.map(item => `
                            <tr>
                                <td>${item.PRODUCTNAME || 'Product'}</td>
                                <td style="text-align: center;">${item.QUANTITY}</td>
                                <td style="text-align: right;">${formatCurrency(item.SALEPRICE)}</td>
                                <td style="text-align: right;">${formatCurrency(item.QUANTITY * item.SALEPRICE)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        content.innerHTML = `
            <div class="invoice-header">
                <div>
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">INV-${invoice.INVOICENUMBER.toString().padStart(4, '0')}</div>
                </div>
                <div>
                    <div class="info-item">
                        <div class="info-label">Invoice Date</div>
                        <div class="info-value">${formatDate(invoice.INVOICEDATE)}</div>
                    </div>
                </div>
            </div>
            
            <div class="invoice-details">
                <div class="bill-to">
                    <h4>Bill To</h4>
                    <div class="client-address">
                        <strong>${invoice.CLIENT_NAME}</strong><br>
                        ${invoice.STREET || ''} ${invoice.CITY || ''} ${invoice.STATE || ''} ${invoice.ZIP || ''}<br>
                        ${invoice.CLIENTEMAIL}
                    </div>
                </div>
                
                <div class="invoice-info">
                    <h4>Invoice Details</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Due Date</div>
                            <div class="info-value">${invoice.BALANCEDUEDATE ? formatDate(invoice.BALANCEDUEDATE) : 'Not set'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value">
                                <span class="invoice-status ${invoice.BALANCEDUE === 0 ? 'status-paid' : 'status-pending'}">
                                    ${invoice.BALANCEDUE === 0 ? 'Paid' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${itemsHtml}
            
            <div class="invoice-totals">
                <div class="totals-grid">
                    <div class="total-row">
                        <div class="total-label">Subtotal:</div>
                        <div class="total-value">${formatCurrency(invoice.SUBTOTAL)}</div>
                    </div>
                    <div class="total-row">
                        <div class="total-label">Tax:</div>
                        <div class="total-value">${formatCurrency(invoice.TAX)}</div>
                    </div>
                    <div class="total-row grand-total">
                        <div class="total-label">Total Due:</div>
                        <div class="total-value">${formatCurrency(invoice.TOTALDUE)}</div>
                    </div>
                </div>
            </div>
            
            <div class="payment-section">
                <h4>Payment Information</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Amount Paid:</div>
                        <div class="info-value">${formatCurrency(invoice.PAYMENTRECEIVED)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Balance Due:</div>
                        <div class="info-value">${formatCurrency(invoice.BALANCEDUE)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Payment Method:</div>
                        <div class="info-value">${invoice.paymentMethod || 'Not specified'}</div>
                    </div>
                </div>
            </div>
            
            ${invoice.notes ? `
                <div class="form-group">
                    <label>Notes</label>
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 6px;">${invoice.notes}</div>
                </div>
            ` : ''}
        `;
        
        currentEditId = invoiceNumber;
        
        // Show modal
        const modal = document.getElementById('invoiceDetailsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading invoice details:', error);
        showNotification('Failed to load invoice details', 'error');
    }
}

/**
 * Edit invoice
 */
async function editInvoice(invoiceNumber) {
    try {
        const invoice = await apiRequest(`/invoices/${invoiceNumber}/details`);
        currentEditId = invoiceNumber;
        
        // Fill form with invoice data
        document.getElementById('invoiceModalTitle').textContent = 'Edit Invoice';
        document.getElementById('invoiceNumberDisplay').textContent = `INV-${invoice.INVOICENUMBER.toString().padStart(4, '0')}`;
        document.getElementById('invoiceDate').value = invoice.INVOICEDATE.split('T')[0];
        document.getElementById('invoiceClient').value = invoice.CLIENTEMAIL;
        updateClientAddress();
        document.getElementById('dueDate').value = invoice.BALANCEDUEDATE ? invoice.BALANCEDUEDATE.split('T')[0] : '';
        document.getElementById('amountPaid').value = invoice.PAYMENTRECEIVED;
        document.getElementById('balanceDue').value = invoice.BALANCEDUE;
        document.getElementById('invoiceNotes').value = invoice.notes || '';
        
        // Show modal
        const modal = document.getElementById('invoiceModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error editing invoice:', error);
        showNotification('Failed to load invoice data', 'error');
    }
}

/**
 * Edit invoice from details modal
 */
function editInvoiceFromDetails() {
    closeInvoiceDetailsModal();
    setTimeout(() => {
        if (currentEditId) {
            editInvoice(currentEditId);
        }
    }, 300);
}

/**
 * Mark invoice as paid
 */
async function markAsPaid() {
    const confirm = await confirmDialog('Mark this invoice as paid? This will update the balance to zero.');
    
    if (!confirm) return;
    
    try {
        await apiRequest(`/invoices/${currentEditId}/pay`, 'PUT', {
            paymentReceived: parseFloat(document.getElementById('totalDue').textContent.replace(/[^0-9.-]+/g, '')) || 0
        });
        
        showNotification('Invoice marked as paid!', 'success');
        closeInvoiceDetailsModal();
        await loadInvoices();
        
    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        showNotification('Failed to update invoice', 'error');
    }
}

/**
 * Delete invoice
 */
async function deleteInvoice(invoiceNumber) {
    const confirm = await confirmDialog(`Are you sure you want to delete invoice INV-${invoiceNumber.toString().padStart(4, '0')}? This action cannot be undone.`);
    
    if (!confirm) return;
    
    try {
        await apiRequest(`/invoices/${invoiceNumber}`, 'DELETE');
        showNotification('Invoice deleted successfully', 'success');
        await loadInvoices();
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('Failed to delete invoice', 'error');
    }
}

/**
 * Print invoice
 */
function printInvoice() {
    window.print();
}

/**
 * Print invoice details
 */
function printInvoiceDetails() {
    const content = document.getElementById('invoiceDetailsContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Invoice Print</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .invoice-title { font-size: 24px; font-weight: bold; }
                .invoice-number { color: #667eea; font-weight: bold; }
                .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                .bill-to, .invoice-info { padding: 15px; background: #f8f9fa; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                th { background: #f8f9fa; }
                .totals { margin-left: auto; width: 300px; }
                .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
                .grand-total { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 10px; }
            </style>
        </head>
        <body>
            ${content}
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * Close invoice modal
 */
function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

/**
 * Close invoice details modal
 */
function closeInvoiceDetailsModal() {
    const modal = document.getElementById('invoiceDetailsModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', initInvoicesPage);