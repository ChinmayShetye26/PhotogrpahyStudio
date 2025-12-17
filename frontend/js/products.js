// ============================================
// PRODUCTS MANAGEMENT JAVASCRIPT
// ============================================

// Global variables
let productsData = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentEditId = null;
let currentView = 'grid';
let currentCategory = 'all';

/**
 * Initialize products page
 */
async function initProductsPage() {
    try {
        await loadProducts();
        updateInventoryStats();
        setupEventListeners();
        updateDateTime();
    } catch (error) {
        console.error('Error initializing products page:', error);
        showNotification('Failed to load products data', 'error');
    }
}

/**
 * Load products from API
 */
async function loadProducts() {
    try {
        const gridView = document.getElementById('gridView');
        gridView.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading products...</p>
            </div>
        `;
        
        const data = await apiRequest('/products');
        productsData = data;
        
        renderProductGrid();
        renderProductsTable();
        renderLowStockTable();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading products:', error);
        const gridView = document.getElementById('gridView');
        gridView.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load products</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadProducts()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

/**
 * Update inventory statistics
 */
function updateInventoryStats() {
    const totalProducts = productsData.length;
    const inStockProducts = productsData.filter(p => p.INITIALSTOCKLEVEL > 10).length;
    const lowStockProducts = productsData.filter(p => p.INITIALSTOCKLEVEL <= 10 && p.INITIALSTOCKLEVEL > 0).length;
    const totalValue = productsData.reduce((sum, product) => {
        return sum + (product.COSTPRICE * product.INITIALSTOCKLEVEL);
    }, 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('inStockProducts').textContent = inStockProducts;
    document.getElementById('lowStockProducts').textContent = lowStockProducts;
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    
    // Show/hide low stock alert
    const lowStockAlert = document.getElementById('lowStockAlert');
    const lowStockCount = document.getElementById('lowStockCount');
    
    if (lowStockProducts > 0) {
        lowStockAlert.style.display = 'flex';
        lowStockCount.textContent = `${lowStockProducts} product${lowStockProducts === 1 ? '' : 's'} ${lowStockProducts === 1 ? 'is' : 'are'} running low on stock`;
    } else {
        lowStockAlert.style.display = 'none';
    }
}

/**
 * Render product grid view
 */
function renderProductGrid() {
    const gridView = document.getElementById('gridView');
    
    if (productsData.length === 0) {
        gridView.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No Products Found</h3>
                <p>Add your first product to get started!</p>
                <button class="btn btn-primary" onclick="openAddProductModal()">
                    <i class="fas fa-plus"></i> Add Product
                </button>
            </div>
        `;
        return;
    }
    
    // Apply filters
    const filteredProducts = applyFilters();
    
    // Clear grid
    gridView.innerHTML = '';
    
    // Add product cards
    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Get product icon based on category
        const icon = getProductIcon(product.PRODUCTNAME);
        
        // Determine stock status
        const stockLevel = product.INITIALSTOCKLEVEL || 0;
        let status = 'instock';
        let statusText = 'In Stock';
        let statusClass = 'status-instock';
        
        if (stockLevel === 0) {
            status = 'outstock';
            statusText = 'Out of Stock';
            statusClass = 'status-outstock';
        } else if (stockLevel <= 10) {
            status = 'lowstock';
            statusText = 'Low Stock';
            statusClass = 'status-lowstock';
        }
        
        // Calculate profit
        const costPrice = product.COSTPRICE || 0;
        const salePrice = product.SALEPRICE || 0;
        const profit = salePrice - costPrice;
        const margin = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : 0;
        
        card.innerHTML = `
            <div class="product-image">
                <i class="fas ${icon}"></i>
            </div>
            
            <div class="product-info">
                <h3>${product.PRODUCTNAME}</h3>
                <div class="product-price">${formatCurrency(salePrice)}</div>
                <div class="product-cost">Cost: ${formatCurrency(costPrice)}</div>
                
                <div class="stock-info">
                    <div class="stock-level">${stockLevel} units</div>
                    <span class="stock-status ${statusClass}">${statusText}</span>
                </div>
                
                <div class="product-supplier">
                    <i class="fas fa-truck"></i> ${product.SUPPLIER || 'No supplier'}
                </div>
                
                <div class="action-buttons" style="display: flex; gap: 10px;">
                    <button class="btn-icon btn-view" onclick="viewProduct('${product.PRODUCTID}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editProduct('${product.PRODUCTID}')" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct('${product.PRODUCTID}')" title="Delete Product">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        gridView.appendChild(card);
    });
}

/**
 * Render products table view
 */
function renderProductsTable() {
    const tableBody = document.getElementById('productsTableBody');
    
    if (productsData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>No Products Found</h3>
                    <p>Add your first product to get started!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Apply filters
    const filteredProducts = applyFilters();
    
    // Calculate pagination for table view
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Add rows
    paginatedProducts.forEach(product => {
        const row = document.createElement('tr');
        
        // Get product category
        const category = getProductCategory(product.PRODUCTNAME);
        const icon = getProductIcon(product.PRODUCTNAME);
        
        // Determine stock status
        const stockLevel = product.INITIALSTOCKLEVEL || 0;
        let statusClass = 'status-instock';
        let statusText = 'In Stock';
        
        if (stockLevel === 0) {
            statusClass = 'status-outstock';
            statusText = 'Out of Stock';
        } else if (stockLevel <= 10) {
            statusClass = 'status-lowstock';
            statusText = 'Low Stock';
        }
        
        row.innerHTML = `
            <td>
                <div class="product-info-cell">
                    <div class="product-image-small">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div>
                        <div class="client-name">${product.PRODUCTNAME}</div>
                        <div class="client-email">SKU: ${product.PRODUCTID}</div>
                    </div>
                </div>
            </td>
            <td>${product.PRODUCTID}</td>
            <td>${category}</td>
            <td>${formatCurrency(product.COSTPRICE)}</td>
            <td>${formatCurrency(product.SALEPRICE)}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span>${stockLevel}</span>
                    <span class="stock-status ${statusClass}" style="font-size: 10px;">${statusText}</span>
                </div>
            </td>
            <td>${product.SUPPLIER || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewProduct('${product.PRODUCTID}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editProduct('${product.PRODUCTID}')" title="Edit Product">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct('${product.PRODUCTID}')" title="Delete Product">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Render low stock table
 */
function renderLowStockTable() {
    const tableBody = document.getElementById('lowStockTableBody');
    
    // Filter low stock products (stock <= 10)
    const lowStockProducts = productsData.filter(product => {
        const stockLevel = product.INITIALSTOCKLEVEL || 0;
        return stockLevel > 0 && stockLevel <= 10;
    });
    
    if (lowStockProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
                    <h3>All Products in Stock</h3>
                    <p>No low stock items found.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Add rows
    lowStockProducts.forEach(product => {
        const row = document.createElement('tr');
        
        const category = getProductCategory(product.PRODUCTNAME);
        const stockLevel = product.INITIALSTOCKLEVEL || 0;
        const minimumStock = 10; // Default minimum
        
        row.innerHTML = `
            <td>
                <div class="client-info">
                    <div class="client-avatar" style="background: #FF9800;">${product.PRODUCTNAME.charAt(0)}</div>
                    <div>
                        <div class="client-name">${product.PRODUCTNAME}</div>
                        <div class="client-email">${category}</div>
                    </div>
                </div>
            </td>
            <td>
                <strong style="color: #FF9800; font-size: 18px;">${stockLevel}</strong>
                <div style="font-size: 12px; color: #718096;">units</div>
            </td>
            <td>${minimumStock} units</td>
            <td>
                <span class="stock-status status-lowstock">Low Stock</span>
                <div style="font-size: 12px; color: #718096; margin-top: 5px;">
                    ${stockLevel === 0 ? 'Out of Stock' : `${minimumStock - stockLevel} below minimum`}
                </div>
            </td>
            <td>${product.SUPPLIER || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="reorderProduct('${product.PRODUCTID}')" title="Reorder">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editProduct('${product.PRODUCTID}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Apply filters to products
 */
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    return productsData.filter(product => {
        // Search filter
        const matchesSearch = product.PRODUCTNAME.toLowerCase().includes(searchTerm) ||
                             (product.SUPPLIER && product.SUPPLIER.toLowerCase().includes(searchTerm));
        
        if (!matchesSearch) return false;
        
        // Category filter
        if (currentCategory !== 'all') {
            const category = getProductCategory(product.PRODUCTNAME);
            if (category.toLowerCase() !== currentCategory.toLowerCase()) {
                return false;
            }
        }
        
        // View-specific filters
        if (currentView === 'lowstock') {
            const stockLevel = product.INITIALSTOCKLEVEL || 0;
            return stockLevel > 0 && stockLevel <= 10;
        }
        
        return true;
    });
}

/**
 * Get product icon based on name/category
 */
function getProductIcon(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('print')) return 'fa-print';
    if (name.includes('album')) return 'fa-book';
    if (name.includes('canvas')) return 'fa-image';
    if (name.includes('frame')) return 'fa-square';
    if (name.includes('digital')) return 'fa-download';
    if (name.includes('download')) return 'fa-cloud-download-alt';
    return 'fa-box';
}

/**
 * Get product category based on name
 */
function getProductCategory(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('print')) return 'Prints';
    if (name.includes('album')) return 'Albums';
    if (name.includes('canvas')) return 'Canvas';
    if (name.includes('frame')) return 'Frames';
    if (name.includes('digital') || name.includes('download')) return 'Digital';
    return 'Other';
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const filteredProducts = applyFilters();
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
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
    const filteredProducts = applyFilters();
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        
        if (viewType === 'table') {
            renderProductsTable();
        } else {
            renderProductGrid();
        }
        
        updatePagination();
    }
}

/**
 * Switch between views
 */
function switchView(view) {
    currentView = view;
    currentPage = 1;
    
    // Hide all views
    document.getElementById('gridView').style.display = 'none';
    document.getElementById('tableView').style.display = 'none';
    document.getElementById('lowStockView').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view and activate button
    const viewElement = document.getElementById(view + 'View');
    if (viewElement) {
        viewElement.style.display = 'block';
    }
    
    // If switching to low stock view, render it
    if (view === 'lowstock') {
        renderLowStockTable();
    }
    
    event.target.classList.add('active');
}

/**
 * Filter by category
 */
function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;
    
    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Re-render views
    renderProductGrid();
    renderProductsTable();
    updatePagination();
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
            renderProductGrid();
            renderProductsTable();
            updatePagination();
            updateInventoryStats();
        }, 300));
    }
    
    // Auto-generate SKU when product name changes
    const productNameInput = document.getElementById('productName');
    if (productNameInput) {
        productNameInput.addEventListener('input', generateSKU);
    }
}

/**
 * Generate SKU from product name
 */
function generateSKU() {
    const productName = document.getElementById('productName').value;
    if (!productName) return;
    
    // Generate a simple SKU: First 3 letters of first word + random numbers
    const words = productName.split(' ');
    let sku = '';
    
    if (words.length > 0) {
        sku = words[0].substring(0, 3).toUpperCase();
    } else {
        sku = productName.substring(0, 3).toUpperCase();
    }
    
    // Add random numbers
    const randomNum = Math.floor(100 + Math.random() * 900);
    sku += randomNum;
    
    const skuInput = document.getElementById('productSKU');
    if (skuInput && !skuInput.value) {
        skuInput.value = sku;
    }
}

/**
 * Calculate profit when sale price changes
 */
function calculateProfit() {
    const costPrice = parseFloat(document.getElementById('costPrice').value) || 0;
    const salePrice = parseFloat(document.getElementById('salePrice').value) || 0;
    const stock = parseFloat(document.getElementById('initialStock').value) || 0;
    
    const profit = salePrice - costPrice;
    const margin = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : 0;
    const totalValue = costPrice * stock;
    
    document.getElementById('profitPerUnit').textContent = formatCurrency(profit);
    document.getElementById('profitMargin').textContent = `${margin}%`;
    document.getElementById('totalProductValue').textContent = formatCurrency(totalValue);
}

/**
 * Adjust stock in modal
 */
function adjustStock(change) {
    const stockInput = document.getElementById('currentStock');
    let currentValue = parseInt(stockInput.value) || 0;
    currentValue = Math.max(0, currentValue + change);
    stockInput.value = currentValue;
}

/**
 * Open add product modal
 */
function openAddProductModal() {
    currentEditId = null;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    title.textContent = 'Add New Product';
    form.reset();
    
    // Hide stock adjustment section for new products
    document.getElementById('stockAdjustmentSection').style.display = 'none';
    
    // Set default values
    document.getElementById('minimumStock').value = 10;
    document.getElementById('initialStock').value = 0;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Save product
 */
async function saveProduct() {
    const form = document.getElementById('productForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const productData = {
        productId: document.getElementById('productSKU').value.trim(),
        productName: document.getElementById('productName').value.trim(),
        costPrice: parseFloat(document.getElementById('costPrice').value) || 0,
        salePrice: parseFloat(document.getElementById('salePrice').value) || 0,
        initialStockLevel: parseInt(document.getElementById('initialStock').value) || 0,
        supplier: document.getElementById('productSupplier').value.trim() || null,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value.trim() || null
    };
    
    try {
        if (currentEditId) {
            // Update existing product
            await apiRequest(`/products/${currentEditId}`, 'PUT', productData);
            showNotification('Product updated successfully!', 'success');
        } else {
            // Create new product
            await apiRequest('/products', 'POST', productData);
            showNotification('Product added successfully!', 'success');
        }
        
        closeProductModal();
        await loadProducts(); // Reload data
        
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification(`Failed to save product: ${error.message}`, 'error');
    }
}

/**
 * View product details
 */
async function viewProduct(productId) {
    try {
        const product = productsData.find(p => p.PRODUCTID == productId);
        if (!product) {
            showNotification('Product not found', 'error');
            return;
        }
        
        const content = document.getElementById('productDetailsContent');
        const icon = getProductIcon(product.PRODUCTNAME);
        const category = getProductCategory(product.PRODUCTNAME);
        
        // Calculate profit information
        const costPrice = product.COSTPRICE || 0;
        const salePrice = product.SALEPRICE || 0;
        const stockLevel = product.INITIALSTOCKLEVEL || 0;
        const profit = salePrice - costPrice;
        const margin = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : 0;
        const totalValue = costPrice * stockLevel;
        
        // Determine stock status
        let statusClass = 'status-instock';
        let statusText = 'In Stock';
        
        if (stockLevel === 0) {
            statusClass = 'status-outstock';
            statusText = 'Out of Stock';
        } else if (stockLevel <= 10) {
            statusClass = 'status-lowstock';
            statusText = 'Low Stock';
        }
        
        content.innerHTML = `
            <div class="product-details-view">
                <div class="product-header" style="display: flex; align-items: center; margin-bottom: 30px;">
                    <div class="product-image" style="width: 100px; height: 100px; margin-right: 20px;">
                        <i class="fas ${icon}" style="font-size: 48px;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #2d3748; font-size: 24px;">${product.PRODUCTNAME}</h3>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <span class="stock-status ${statusClass}">${statusText}</span>
                            <span style="color: #718096;">SKU: ${product.PRODUCTID}</span>
                            <span style="color: #718096;">Category: ${category}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-tags"></i> Pricing Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Cost Price:</label>
                            <span>${formatCurrency(costPrice)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Sale Price:</label>
                            <span>${formatCurrency(salePrice)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Profit per Unit:</label>
                            <span style="color: #4CAF50; font-weight: 700;">${formatCurrency(profit)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Profit Margin:</label>
                            <span style="color: #4CAF50; font-weight: 700;">${margin}%</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-boxes"></i> Inventory Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Current Stock:</label>
                            <span><strong style="font-size: 20px;">${stockLevel}</strong> units</span>
                        </div>
                        <div class="detail-item">
                            <label>Inventory Value:</label>
                            <span>${formatCurrency(totalValue)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Supplier:</label>
                            <span>${product.SUPPLIER || 'Not specified'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Last Restocked:</label>
                            <span>${product.lastRestocked ? formatDate(product.lastRestocked) : 'Not available'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> Sales Performance</h4>
                    <div class="performance-stats" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="stat-item">
                            <h4>${Math.floor(Math.random() * 50) + 10}</h4>
                            <p>Units Sold</p>
                        </div>
                        <div class="stat-item">
                            <h4>${formatCurrency((Math.random() * 1000) + 500)}</h4>
                            <p>Revenue</p>
                        </div>
                        <div class="stat-item">
                            <h4>${((Math.random() * 30) + 10).toFixed(1)}%</h4>
                            <p>Profit Margin</p>
                        </div>
                        <div class="stat-item">
                            <h4>${Math.floor(Math.random() * 20) + 1}</h4>
                            <p>Monthly Avg.</p>
                        </div>
                    </div>
                </div>
                
                ${product.description ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-file-alt"></i> Description</h4>
                        <div style="padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            ${product.description}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        currentEditId = productId;
        
        // Show modal
        const modal = document.getElementById('productDetailsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error loading product details:', error);
        showNotification('Failed to load product details', 'error');
    }
}

/**
 * Edit product
 */
function editProduct(productId) {
    const product = productsData.find(p => p.PRODUCTID == productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    currentEditId = productId;
    
    // Fill form with product data
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = product.PRODUCTNAME || '';
    document.getElementById('productSKU').value = product.PRODUCTID || '';
    document.getElementById('productCategory').value = getProductCategory(product.PRODUCTNAME).toLowerCase() || '';
    document.getElementById('productSupplier').value = product.SUPPLIER || '';
    document.getElementById('costPrice').value = product.COSTPRICE || 0;
    document.getElementById('salePrice').value = product.SALEPRICE || 0;
    document.getElementById('initialStock').value = product.INITIALSTOCKLEVEL || 0;
    document.getElementById('minimumStock').value = 10; // Default
    document.getElementById('productDescription').value = product.description || '';
    
    // Show stock adjustment section
    document.getElementById('stockAdjustmentSection').style.display = 'flex';
    document.getElementById('currentStock').value = product.INITIALSTOCKLEVEL || 0;
    
    // Calculate profit
    calculateProfit();
    
    // Show modal
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Edit product from details modal
 */
function editProductFromDetails() {
    closeProductDetailsModal();
    setTimeout(() => {
        if (currentEditId) {
            editProduct(currentEditId);
        }
    }, 300);
}

/**
 * Delete product
 */
async function deleteProduct(productId) {
    const product = productsData.find(p => p.PRODUCTID == productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    const confirm = await confirmDialog(`Are you sure you want to delete "${product.PRODUCTNAME}"? This action cannot be undone.`);
    
    if (!confirm) return;
    
    try {
        await apiRequest(`/products/${productId}`, 'DELETE');
        showNotification('Product deleted successfully', 'success');
        await loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Failed to delete product', 'error');
    }
}

/**
 * Reorder product
 */
function reorderProduct(productId) {
    showNotification('Reorder functionality would be implemented here', 'info');
    // In a real application, this would:
    // 1. Check supplier information
    // 2. Create a purchase order
    // 3. Send email to supplier
    // 4. Update product status to "On Order"
}

/**
 * View low stock products
 */
function viewLowStock() {
    switchView('lowstock');
}

/**
 * Export inventory
 */
function exportInventory() {
    showNotification('Export functionality would be implemented here', 'info');
    // In a real application, this would export to CSV or Excel
}

/**
 * Print inventory
 */
function printInventory() {
    window.print();
}

/**
 * Reorder stock
 */
function reorderStock() {
    showNotification('Bulk reorder functionality would be implemented here', 'info');
}

/**
 * Close product modal
 */
function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

/**
 * Close product details modal
 */
function closeProductDetailsModal() {
    const modal = document.getElementById('productDetailsModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditId = null;
}

// Add CSS for loading state
const productsStyles = document.createElement('style');
productsStyles.textContent = `
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
    
    .product-details-view .detail-section {
        margin-bottom: 30px;
    }
    
    .product-details-view .detail-section h4 {
        color: #4a5568;
        margin-bottom: 15px;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
`;

document.head.appendChild(productsStyles);

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', initProductsPage);