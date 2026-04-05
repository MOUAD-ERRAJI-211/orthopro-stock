class InventoryManager {
    constructor() {
        this.allPieces = [];
        this.notifications = [];
        this.selectedPiece = null;
        this.qrScanner = null;
        this.currentPieceForQR = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadInventory();
    }

    // Initialize DOM elements
    initializeElements() {
        // Header elements
        this.backBtn = document.getElementById('back-btn');
        this.notificationBtn = document.getElementById('notification-btn');
        this.notificationBadge = document.getElementById('notification-badge');
        
        // Search and filter elements
        this.searchInput = document.getElementById('search-input');
        this.categoryFilter = document.getElementById('category-filter');
        this.stockFilter = document.getElementById('stock-filter');
        this.searchBtn = document.getElementById('search-btn');
        
        // Action buttons
        this.addPieceBtn = document.getElementById('add-piece-btn');
        this.addStudentBtn = document.getElementById('add-student-btn');
        this.exportMonthBtn = document.getElementById('export-month-btn');
        this.exportAdjustmentsBtn = document.getElementById('export-adjustments-btn');
        this.monthSelector = document.getElementById('month-selector');
        
        // Table elements
        this.inventoryTable = document.getElementById('inventory-table').querySelector('tbody');
        
        // Modal elements
        this.itemDetailsModal = document.getElementById('item-details-modal');
        this.addPieceModal = document.getElementById('add-piece-modal');
        this.addStudentModal = document.getElementById('add-student-modal');
        this.qrModal = document.getElementById('qr-modal');
        
        // Notification panel
        this.notificationPanel = document.getElementById('notification-panel');
        this.notificationContent = document.getElementById('notification-panel-content');
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
        
        // Loading overlay
        this.globalLoading = document.getElementById('global-loading');
    }

    // Bind all event listeners
    bindEvents() {
        // Header events
        this.backBtn.addEventListener('click', () => this.goToDashboard());
        this.notificationBtn.addEventListener('click', () => this.toggleNotificationPanel());
        
        // Search and filter events
        this.searchBtn.addEventListener('click', () => this.filterInventory());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.filterInventory();
        });
        this.categoryFilter.addEventListener('change', () => this.filterInventory());
        this.stockFilter.addEventListener('change', () => this.filterInventory());
        
        // Action button events
        this.addPieceBtn.addEventListener('click', () => this.openAddPieceModal());
        this.addStudentBtn.addEventListener('click', () => this.openAddStudentModal());
        this.exportMonthBtn.addEventListener('click', () => this.exportMonthlyInventory());
        this.exportAdjustmentsBtn.addEventListener('click', () => this.exportAdjustmentHistory());
        
        // Modal close events
        this.bindModalEvents();
        
        // Form events
        this.bindFormEvents();
    }

    bindModalEvents() {
        // Close buttons
        document.querySelectorAll('.close-btn, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal, .qr-modal');
                if (modal) this.closeModal(modal);
            });
        });
        
        // Click outside to close
        [this.itemDetailsModal, this.addPieceModal, this.addStudentModal, this.qrModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });
        
        // Notification panel close
        document.getElementById('close-notifications').addEventListener('click', () => {
            this.notificationPanel.classList.remove('open');
        });
        
        // Click outside notification panel
        document.addEventListener('click', (e) => {
            if (this.notificationPanel.classList.contains('open') && 
                !this.notificationBtn.contains(e.target) && 
                !this.notificationPanel.contains(e.target)) {
                this.notificationPanel.classList.remove('open');
            }
        });
    }

    bindFormEvents() {
        // Add piece form
        document.getElementById('add-piece-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddPiece();
        });
        
        // Add student form
        document.getElementById('add-student-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddStudent();
        });
        
        // Cancel buttons
        document.getElementById('cancel-piece-btn').addEventListener('click', () => {
            this.closeModal(this.addPieceModal);
        });
        
        document.getElementById('cancel-student-btn').addEventListener('click', () => {
            this.closeModal(this.addStudentModal);
        });
        
        // Threshold form
        document.getElementById('save-thresholds-btn').addEventListener('click', () => {
            this.saveThresholds();
        });
        
        // Tab switching for statistics
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Image upload
        document.getElementById('upload-image-btn').addEventListener('click', () => {
            document.getElementById('image-upload-input').click();
        });
        
        document.getElementById('image-upload-input').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.uploadPieceImage(e.target.files[0]);
            }
        });
        
        
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`${tabName}-tab`).style.display = 'block';
    }

    // Navigation
    goToDashboard() {
        window.location.href = '../dashboard/dashboard.html';
    }

    // Loading functions
    showLoading() {
        this.globalLoading.style.display = 'flex';
    }

    hideLoading() {
        this.globalLoading.style.display = 'none';
    }

    // Load inventory data
    async loadInventory() {
        try {
            this.showLoading();
            
            // Load pieces
            this.allPieces = await apiService.getAllPieces();
            this.displayInventory(this.allPieces);
            
            // Load categories for filter
            const categories = await apiService.getCategories();
            this.populateCategories(categories);
            
            // Check for stock alerts
            this.checkStockAlerts();
            
            this.hideLoading();
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.hideLoading();
            this.showToast('Error', 'Failed to load inventory data', 'error');
            this.inventoryTable.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 2rem; color: var(--text-error);">
                        Failed to load inventory. Please refresh the page.
                    </td>
                </tr>
            `;
        }
    }

    // Display inventory in table
    displayInventory(pieces) {
        this.inventoryTable.innerHTML = '';
        
        if (pieces.length === 0) {
            this.inventoryTable.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        No items found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }
        
        pieces.forEach(piece => {
            const row = this.createTableRow(piece);
            this.inventoryTable.appendChild(row);
        });
    }

    createTableRow(piece) {
        const row = document.createElement('tr');
        
        // Determine stock status
        let stockClass = 'stock-normal';
        let rowClass = '';
        
        if (piece.currentStock <= 0) {
            stockClass = 'stock-out';
            rowClass = 'critical-row'; // Red row for out of stock
        } else if (piece.minThreshold && piece.currentStock <= piece.minThreshold) {
            stockClass = 'stock-low';
            rowClass = 'warning-row'; // Orange row for low stock
        } else if (piece.maxThreshold && piece.currentStock >= piece.maxThreshold) {
            stockClass = 'stock-critical';
        }
        
        // Add row class for styling
        if (rowClass) {
            row.className = rowClass;
        }
        
        row.innerHTML = `
            <td>
                ${piece.imageUrl ? 
                    `<img src="${this.getFullImageUrl(piece.imageUrl)}" alt="${piece.name}" class="item-image" 
                          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="no-image" style="display: none;">
                         <i class="fas fa-image"></i>
                     </div>` :
                    `<div class="no-image">
                         <i class="fas fa-image"></i>
                     </div>`
                }
            </td>
            <td>${piece.id || 'N/A'}</td>
            <td><strong>${piece.name || 'N/A'}</strong></td>
            <td>${piece.category}${piece.subcategory ? ` - ${piece.subcategory}` : ''}</td>
            <td>${this.formatPieceType(piece.pieceType)}</td>
            <td>${piece.supplier || 'N/A'}</td>
            <td>${piece.reference || 'N/A'}</td>
            <td>${piece.initialStock || 0}</td>
            <td>${piece.entries || 0}</td>
            <td>${piece.exits || 0}</td>
            <td>
                <span class="stock-status ${stockClass}">
                    ${piece.currentStock}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn-sm view-btn" data-action="view" data-id="${piece.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn-sm adjust-btn" data-action="adjust" data-id="${piece.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn-sm qr-btn" data-action="qr" data-id="${piece.id}">
                        <i class="fas fa-qrcode"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Bind action button events
        row.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const pieceId = parseInt(e.currentTarget.dataset.id);
                const piece = this.allPieces.find(p => p.id === pieceId);
                
                if (piece) {
                    switch (action) {
                        case 'view':
                            this.openItemDetailsModal(piece);
                            break;
                        case 'adjust':
                            this.promptStockAdjustment(piece);
                            break;
                        case 'qr':
                            this.openQRScanner(piece);
                            break;
                    }
                }
            });
        });
        
        return row;
    }

    formatPieceType(type) {
        if (!type) return 'N/A';
        return type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    getFullImageUrl(imageUrl) {
        if (!imageUrl) return '';
        
        // If already a full URL, return as is
        if (imageUrl.startsWith('http')) {
            return imageUrl;
        }
        
        // Make sure it starts with /
        if (!imageUrl.startsWith('/')) {
            imageUrl = '/' + imageUrl;
        }
        
        // Get base URL from API config or current location
        const baseUrl = API_CONFIG?.BASE_URL || window.location.origin;
        return baseUrl + imageUrl;
    }

    // Filter inventory
    filterInventory() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const category = this.categoryFilter.value;
        const stockLevel = this.stockFilter.value;
        
        let filteredPieces = this.allPieces;
        
        // Apply search term filter
        if (searchTerm) {
            filteredPieces = filteredPieces.filter(piece => 
                piece.name.toLowerCase().includes(searchTerm) || 
                (piece.reference && piece.reference.toLowerCase().includes(searchTerm)) ||
                piece.category.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply category filter
        if (category) {
            filteredPieces = filteredPieces.filter(piece => piece.category === category);
        }
        
        // Apply stock level filter
        if (stockLevel) {
            switch (stockLevel) {
                case 'low':
                    filteredPieces = filteredPieces.filter(piece => 
                        piece.minThreshold && piece.currentStock <= piece.minThreshold && piece.currentStock > 0
                    );
                    break;
                case 'critical':
                    filteredPieces = filteredPieces.filter(piece => piece.currentStock <= 5);
                    break;
                case 'out':
                    filteredPieces = filteredPieces.filter(piece => piece.currentStock <= 0);
                    break;
            }
        }
        
        this.displayInventory(filteredPieces);
    }

    // Populate categories in filter
    populateCategories(categories) {
        this.categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categoryFilter.appendChild(option);
        });
        
        // Also populate add piece form categories
        const pieceCategory = document.getElementById('piece-category');
        if (pieceCategory) {
            pieceCategory.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                pieceCategory.appendChild(option);
            });
        }
    }

    // Stock alerts
    checkStockAlerts() {
        this.notifications = [];
        
        // Out of stock items
        const outOfStockItems = this.allPieces.filter(piece => piece.currentStock <= 0);
        outOfStockItems.forEach(piece => {
            this.notifications.push({
                type: 'critical',
                title: 'Out of Stock',
                message: `${piece.name} is completely out of stock`,
                piece: piece
            });
        });
        
        // Low stock items
        const lowStockItems = this.allPieces.filter(piece => 
            piece.minThreshold && 
            piece.currentStock <= piece.minThreshold && 
            piece.currentStock > 0
        );
        lowStockItems.forEach(piece => {
            this.notifications.push({
                type: 'warning',
                title: 'Low Stock Warning',
                message: `${piece.name} is below minimum threshold (${piece.currentStock}/${piece.minThreshold})`,
                piece: piece
            });
        });
        
        // Update notification badge
        this.notificationBadge.textContent = this.notifications.length;
        
        // Auto-toast removed: user opens panel manually
    }

    // Notification panel
    toggleNotificationPanel() {
        this.notificationPanel.classList.toggle('open');
        if (this.notificationPanel.classList.contains('open')) {
            this.displayNotifications();
        }
    }

    displayNotifications() {
        if (this.notifications.length === 0) {
            this.notificationContent.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <p>No stock alerts at the moment</p>
                </div>
            `;
            return;
        }
        
        this.notificationContent.innerHTML = '';
        
        this.notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${notification.type}`;
            
            const icon = notification.type === 'critical' ? 'fa-exclamation-triangle' :
                        notification.type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
            
            item.innerHTML = `
                <div class="notif-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notif-body">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.notificationPanel.classList.remove('open');
                this.openItemDetailsModal(notification.piece);
            });
            
            this.notificationContent.appendChild(item);
        });
    }

    // Modal functions
    openModal(modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // Add piece modal
    openAddPieceModal() {
        this.openModal(this.addPieceModal);
    }

    async handleAddPiece() {
        const formData = new FormData(document.getElementById('add-piece-form'));
        const pieceData = {
            name: formData.get('piece-name') || document.getElementById('piece-name').value,
            reference: document.getElementById('piece-reference').value || null,
            category: document.getElementById('piece-category').value,
            subcategory: document.getElementById('piece-subcategory').value,
            pieceType: document.getElementById('piece-type').value,
            supplier: document.getElementById('piece-supplier').value || null,
            initialStock: parseInt(document.getElementById('piece-initial-stock').value),
            location: document.getElementById('piece-location').value,
            notes: document.getElementById('piece-notes').value || null
        };
        
        try {
            this.showLoading();
            await apiService.createPiece(pieceData);
            
            this.closeModal(this.addPieceModal);
            document.getElementById('add-piece-form').reset();
            
            // Reload inventory
            await this.loadInventory();
            
            this.showToast('Success', 'New piece added successfully!', 'success');
            this.hideLoading();
        } catch (error) {
            console.error('Error adding piece:', error);
            this.hideLoading();
            this.showToast('Error', 'Failed to add piece: ' + error.message, 'error');
        }
    }

    // Add student modal
    openAddStudentModal() {
        this.openModal(this.addStudentModal);
    }

    async handleAddStudent() {
        const studentData = {
            fullName: document.getElementById('student-fullname').value,
            studentCode: document.getElementById('student-code').value,
            email: document.getElementById('student-email').value || null,
            classGroup: document.getElementById('student-class').value || null,
            academicYear: document.getElementById('student-academic-year').value || null,
            status: 'ACTIVE'
        };
        
        try {
            this.showLoading();
            const response = await apiService.createStudent(studentData);
            
            this.closeModal(this.addStudentModal);
            document.getElementById('add-student-form').reset();
            
            this.showToast('Success', 'New student added successfully!', 'success');
            
            // Generate PDF after a delay
            setTimeout(() => {
                this.generateStudentDeclaration(response.student, response);
            }, 1000);
            
            this.hideLoading();
        } catch (error) {
            console.error('Error adding student:', error);
            this.hideLoading();
            this.showToast('Error', 'Failed to add student: ' + error.message, 'error');
        }
    }

    // Item details modal
    async openItemDetailsModal(piece) {
        this.selectedPiece = piece;
        
        // Update modal content
        document.getElementById('modal-item-name').textContent = piece.name || 'Unknown Item';
        
        const modalImage = document.getElementById('modal-item-image');
        if (piece.imageUrl) {
            modalImage.src = this.getFullImageUrl(piece.imageUrl);
            modalImage.onerror = () => {
                modalImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999">No Image</text></svg>';
            };
        } else {
            modalImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="%23999">No Image</text></svg>';
        }
        
        document.getElementById('modal-item-category').textContent = 
            `${piece.category || 'N/A'}${piece.subcategory ? ` - ${piece.subcategory}` : ''}`;
        document.getElementById('modal-item-type').textContent = this.formatPieceType(piece.pieceType);
        document.getElementById('modal-item-stock').textContent = piece.currentStock || 0;
        document.getElementById('modal-item-location').textContent = piece.location || 'N/A';
        document.getElementById('modal-item-reference').textContent = piece.reference || 'N/A';
        
        // Set threshold inputs
        document.getElementById('min-threshold').value = piece.minThreshold || '';
        document.getElementById('max-threshold').value = piece.maxThreshold || '';
        
        this.openModal(this.itemDetailsModal);
        
        // Load statistics
        setTimeout(() => {
            this.loadItemStatistics(piece.id);
        }, 300);
    }

    async loadItemStatistics(pieceId) {
        try {
            const monthlyContainer = document.getElementById('monthly-transactions');
            monthlyContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading transaction data...</div>';
            
            const transactions = await apiService.getPieceTransactions(pieceId);
            
            if (!transactions || transactions.length === 0) {
                monthlyContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No transaction history available</div>';
                return;
            }
            
            const monthlyData = this.processMonthlyTransactions(transactions);
            this.displayMonthlyData(monthlyData, monthlyContainer);
            
        } catch (error) {
            console.error('Error loading statistics:', error);
            const monthlyContainer = document.getElementById('monthly-transactions');
            monthlyContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-error);">Error loading statistics</div>';
        }
    }

    processMonthlyTransactions(transactions) {
        const monthlyData = new Map();
        
        transactions.forEach(transaction => {
            if (Array.isArray(transaction.transactionDate)) {
                const [year, month] = transaction.transactionDate;
                const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
                
                if (!monthlyData.has(monthKey)) {
                    monthlyData.set(monthKey, {
                        checkouts: 0,
                        returns: 0,
                        total: 0,
                        transactions: []
                    });
                }
                
                const monthData = monthlyData.get(monthKey);
                monthData.transactions.push(transaction);
                monthData.total++;
                
                if (transaction.transactionType === 'CHECKOUT') {
                    monthData.checkouts++;
                } else if (transaction.transactionType === 'RETURN') {
                    monthData.returns++;
                }
            }
        });
        
        return Array.from(monthlyData.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }

    displayMonthlyData(monthlyData, container) {
        container.innerHTML = '';
        
        monthlyData.forEach(([monthKey, data]) => {
            const monthName = this.formatMonthLabel(monthKey);
            
            const monthItem = document.createElement('div');
            monthItem.className = 'month-item';
            monthItem.dataset.month = monthKey;
            monthItem.innerHTML = `
                <div class="month-name">${monthName}</div>
                <div class="month-count">
                    <div class="count-box total">Total: ${data.total}</div>
                    <div class="count-box checkouts">Checkouts: ${data.checkouts}</div>
                    <div class="count-box returns">Returns: ${data.returns}</div>
                </div>
            `;
            
            // Create days dropdown container
            const daysDropdown = document.createElement('div');
            daysDropdown.className = 'days-dropdown';
            daysDropdown.dataset.month = monthKey;
            
            // Add click event to month item
            monthItem.addEventListener('click', () => {
                // Toggle dropdown
                const isOpen = daysDropdown.classList.contains('open');
                
                // Close all other dropdowns
                container.querySelectorAll('.days-dropdown.open').forEach(dropdown => {
                    if (dropdown !== daysDropdown) {
                        dropdown.classList.remove('open');
                    }
                });
                
                // Toggle this dropdown
                if (isOpen) {
                    daysDropdown.classList.remove('open');
                } else {
                    daysDropdown.classList.add('open');
                    
                    // Load days data if not already loaded
                    if (daysDropdown.children.length === 0) {
                        this.loadDaysForMonth(daysDropdown, monthKey, data.transactions);
                    }
                }
            });
            
            container.appendChild(monthItem);
            container.appendChild(daysDropdown);
        });
    }

    loadDaysForMonth(container, monthKey, transactions) {
        try {
            // Process daily data
            const dailyData = this.processDailyTransactions(transactions, monthKey);
            
            if (!dailyData || dailyData.length === 0) {
                container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No daily transaction data available</div>';
                return;
            }
            
            // Display daily data
            dailyData.forEach(([dayKey, data]) => {
                const dayItem = document.createElement('div');
                dayItem.className = 'day-item';
                dayItem.dataset.day = dayKey;
                dayItem.dataset.month = monthKey;
                
                const dayNumber = parseInt(dayKey);
                
                dayItem.innerHTML = `
                    <div class="day-date">Day ${dayNumber}</div>
                    <div class="day-count">
                        <span class="count-box total">Total: ${data.total}</span>
                        <span class="count-box checkouts">Checkouts: ${data.checkouts}</span>
                        <span class="count-box returns">Returns: ${data.returns}</span>
                    </div>
                `;
                
                // Add click event to show transaction details
                dayItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.displayDailyTransactions(dayKey, data.transactions, monthKey);
                });
                
                container.appendChild(dayItem);
            });
        } catch (error) {
            console.error('Error loading days data:', error);
            container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-error);">Error processing daily data</div>';
        }
    }

    processDailyTransactions(transactions, monthKey) {
        const dailyData = new Map();
        const [year, month] = monthKey.split('-').map(Number);
        
        transactions.forEach(transaction => {
            if (Array.isArray(transaction.transactionDate)) {
                const [tYear, tMonth, tDay] = transaction.transactionDate;
                
                if (tYear === year && tMonth === month) {
                    const dayKey = tDay.toString().padStart(2, '0');
                    
                    if (!dailyData.has(dayKey)) {
                        dailyData.set(dayKey, {
                            checkouts: 0,
                            returns: 0,
                            total: 0,
                            transactions: []
                        });
                    }
                    
                    const dayData = dailyData.get(dayKey);
                    dayData.transactions.push(transaction);
                    dayData.total++;
                    
                    if (transaction.transactionType === 'CHECKOUT') {
                        dayData.checkouts++;
                    } else if (transaction.transactionType === 'RETURN') {
                        dayData.returns++;
                    }
                }
            }
        });
        
        return Array.from(dailyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }

    displayDailyTransactions(day, transactions, monthKey) {
        // Switch to daily tab
        const dailyTabBtn = document.querySelector('.tab-btn[data-tab="daily"]');
        if (dailyTabBtn && !dailyTabBtn.classList.contains('active')) {
            // Activate daily tab
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            
            dailyTabBtn.classList.add('active');
            document.getElementById('daily-tab').style.display = 'block';
        }
        
        const dailyTransactionsContainer = document.getElementById('daily-transactions');
        if (!dailyTransactionsContainer) return;
        
        dailyTransactionsContainer.innerHTML = '';
        
        // Format the date for display
        const [year, month] = monthKey.split('-');
        const dateHeader = document.createElement('h4');
        dateHeader.style.cssText = 'margin-bottom: 1rem; color: var(--text-primary); font-size: 1.1rem;';
        dateHeader.textContent = `Transactions for ${month}/${day}/${year}`;
        dailyTransactionsContainer.appendChild(dateHeader);
        
        // Sort transactions by time
        transactions.sort((a, b) => {
            if (Array.isArray(a.transactionDate) && Array.isArray(b.transactionDate)) {
                const aHour = a.transactionDate[3] || 0;
                const aMinute = a.transactionDate[4] || 0;
                const bHour = b.transactionDate[3] || 0;
                const bMinute = b.transactionDate[4] || 0;
                
                if (aHour !== bHour) return aHour - bHour;
                return aMinute - bMinute;
            }
            return 0;
        });
        
        // Display each transaction
        transactions.forEach(transaction => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 0.8rem;
                background: var(--bg-card);
                border-radius: var(--radius-sm);
                margin-bottom: 0.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 1px solid var(--border-light);
            `;
            
            // Format time
            let timeStr = 'N/A';
            if (Array.isArray(transaction.transactionDate)) {
                const [, , , hour = 0, minute = 0] = transaction.transactionDate;
                timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            }
            
            // Get student name safely
            let studentName = 'Unknown Student';
            if (transaction.student) {
                studentName = transaction.student.fullName || 
                              `Student ${transaction.student.studentCode || transaction.student.id || ''}`;
            }
            
            const quantity = transaction.quantity ? Math.abs(transaction.quantity) : 1;
            const typeClass = transaction.transactionType === 'CHECKOUT' ? 'checkout' : 'return';
            const typeColor = transaction.transactionType === 'CHECKOUT' ? '#e53e3e' : '#38a169';
            
            item.innerHTML = `
                <div>
                    <span style="font-weight: 600; margin-right: 0.5rem; color: var(--text-primary);">${timeStr}</span>
                    <span style="
                        padding: 0.2rem 0.4rem;
                        border-radius: 3px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        background: ${typeColor}15;
                        color: ${typeColor};
                    ">${transaction.transactionType}</span>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 500; margin-bottom: 0.2rem;">${studentName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Qty: ${quantity}</div>
                </div>
            `;
            
            dailyTransactionsContainer.appendChild(item);
        });
        
        // If no transactions, show message
        if (transactions.length === 0) {
            const noData = document.createElement('div');
            noData.style.cssText = 'padding: 2rem; text-align: center; color: var(--text-muted);';
            noData.textContent = 'No transactions on this day';
            dailyTransactionsContainer.appendChild(noData);
        }
    }

    formatMonthLabel(monthKey) {
        const [year, month] = monthKey.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(month) - 1;
        return `${monthNames[monthIndex]} ${year}`;
    }

    // Stock adjustment
    promptStockAdjustment(piece) {
        const newQuantity = prompt(
            `Adjust stock for ${piece.name}\nCurrent stock: ${piece.currentStock}\n\nEnter new quantity:`, 
            piece.currentStock
        );
        
        if (newQuantity === null) return;
        
        const quantity = parseInt(newQuantity);
        if (isNaN(quantity) || quantity < 0) {
            this.showToast('Error', 'Please enter a valid number', 'error');
            return;
        }
        
        this.adjustStock(piece.id, quantity - piece.currentStock, quantity);
    }

    async adjustStock(pieceId, adjustment, newStock) {
        try {
            this.showLoading();
            
            const adjustmentData = {
                adjustment: adjustment,
                newStock: newStock,
                reason: 'Manual adjustment',
                createTransaction: true
            };
            
            await apiService.adjustPieceStock(pieceId, adjustmentData);
            
            // Reload inventory
            await this.loadInventory();
            
            this.showToast('Success', `Stock adjusted to ${newStock}`, 'success');
            this.hideLoading();
        } catch (error) {
            console.error('Error adjusting stock:', error);
            this.hideLoading();
            this.showToast('Error', 'Failed to adjust stock: ' + error.message, 'error');
        }
    }

    // Save thresholds
    async saveThresholds() {
        if (!this.selectedPiece) return;
        
        const minThreshold = document.getElementById('min-threshold').value ? 
                           parseInt(document.getElementById('min-threshold').value) : null;
        const maxThreshold = document.getElementById('max-threshold').value ? 
                           parseInt(document.getElementById('max-threshold').value) : null;
        
        if (minThreshold !== null && maxThreshold !== null && minThreshold > maxThreshold) {
            this.showToast('Error', 'Minimum threshold cannot be greater than maximum threshold', 'error');
            return;
        }
        
        try {
            const updateData = {
                minThreshold: minThreshold,
                maxThreshold: maxThreshold
            };
            
            // Use the correct API method - updatePiece with thresholds data
            await apiService.updatePiece(this.selectedPiece.id, updateData);
            
            // Update local data
            this.selectedPiece.minThreshold = minThreshold;
            this.selectedPiece.maxThreshold = maxThreshold;
            
            const index = this.allPieces.findIndex(p => p.id === this.selectedPiece.id);
            if (index !== -1) {
                this.allPieces[index].minThreshold = minThreshold;
                this.allPieces[index].maxThreshold = maxThreshold;
            }
            
            // Refresh table and alerts
            this.displayInventory(this.allPieces);
            this.checkStockAlerts();
            
            this.showToast('Success', 'Stock thresholds updated successfully', 'success');
        } catch (error) {
            console.error('Error saving thresholds:', error);
            this.showToast('Error', 'Failed to save thresholds: ' + error.message, 'error');
        }
    }

    // Image upload
    async uploadPieceImage(file) {
        if (!this.selectedPiece) return;
        
        try {
            const loadingOverlay = document.getElementById('image-loading-overlay');
            loadingOverlay.style.display = 'flex';
            
            const response = await apiService.uploadPieceImage(this.selectedPiece.id, file);
            
            // Update image in modal
            document.getElementById('modal-item-image').src = response.imageUrl;
            
            // Update local data
            this.selectedPiece.imageUrl = response.imageUrl;
            const index = this.allPieces.findIndex(p => p.id === this.selectedPiece.id);
            if (index !== -1) {
                this.allPieces[index].imageUrl = response.imageUrl;
            }
            
            // Refresh table
            this.displayInventory(this.allPieces);
            
            this.showToast('Success', 'Image uploaded successfully', 'success');
            loadingOverlay.style.display = 'none';
        } catch (error) {
            console.error('Error uploading image:', error);
            document.getElementById('image-loading-overlay').style.display = 'none';
            this.showToast('Error', 'Failed to upload image: ' + error.message, 'error');
        }
    }

    // QR Scanner
    openQRScanner(piece) {
        this.currentPieceForQR = piece;
        this.openModal(this.qrModal);
        setTimeout(() => this.initQRScanner(), 300);
    }

    initQRScanner() {
        if (!window.Html5Qrcode) {
            this.showToast('Error', 'QR scanner not available. Please use manual entry.', 'error');
            return;
        }
        
        try {
            const qrReader = document.getElementById('scanner-placeholder');
            qrReader.innerHTML = '';
            
            this.qrScanner = new Html5Qrcode('scanner-placeholder');
            
            const config = {
                fps: 10,
                qrbox: { width: 280, height: 280 },
                rememberLastUsedCamera: true
            };
            
            this.qrScanner.start(
                { facingMode: "environment" },
                config,
                (decodedText) => this.onQRScanSuccess(decodedText),
                (error) => console.warn('QR scan error:', error)
            ).catch(error => {
                console.error('Error starting scanner:', error);
                qrReader.innerHTML = `
                    <div style="color: white; text-align: center; padding: 2rem;">
                        Camera not available. Please use manual entry below.
                    </div>
                `;
            });
        } catch (error) {
            console.error('Error initializing scanner:', error);
            this.showToast('Error', 'Failed to initialize QR scanner', 'error');
        }
    }

    onQRScanSuccess(decodedText) {
        if (this.qrScanner) {
            this.qrScanner.stop().catch(console.error);
        }
        
        this.closeModal(this.qrModal);
        
        if (this.currentPieceForQR) {
            this.assignQRCodeToPiece(this.currentPieceForQR, decodedText);
        }
    }

    async assignQRCodeToPiece(piece, qrCode) {
        try {
            await apiService.updatePieceQrCode(piece.id, qrCode);
            
            // Update local data
            piece.qrCode = qrCode;
            const index = this.allPieces.findIndex(p => p.id === piece.id);
            if (index !== -1) {
                this.allPieces[index].qrCode = qrCode;
            }
            
            this.showToast('Success', `QR code assigned to ${piece.name}`, 'success');
        } catch (error) {
            console.error('Error assigning QR code:', error);
            this.showToast('Error', 'Failed to assign QR code: ' + error.message, 'error');
        }
    }

    // Export functions
    // Export functions
    async exportMonthlyInventory() {
        const month = this.monthSelector.value;
        if (!month) {
            this.showToast('Selection Required', 'Please select a month to export', 'warning');
            return;
        }
        
        try {
            this.showLoading();
            const year = new Date().getFullYear();
            const pieces = await apiService.getInventoryByMonth(month, year);
            
            if (!pieces || pieces.length === 0) {
                this.showToast('No Data', 'No inventory data found for this month', 'warning');
                this.hideLoading();
                return;
            }
            
            await this.generateInventoryPDF(pieces, month, year);
            this.hideLoading();
        } catch (error) {
            console.error('Error exporting monthly inventory:', error);
            this.hideLoading();
            this.showToast('Export Failed', 'Failed to generate monthly report: ' + error.message, 'error');
        }
    }

    async exportAdjustmentHistory() {
        try {
            this.showLoading();
            const adjustments = await apiService.getAdjustmentHistory();
            
            if (!adjustments || adjustments.length === 0) {
                this.showToast('No Data', 'No adjustment history found', 'warning');
                this.hideLoading();
                return;
            }
            
            await this.generateAdjustmentHistoryPDF(adjustments);
            this.hideLoading();
        } catch (error) {
            console.error('Error exporting adjustment history:', error);
            this.hideLoading();
            this.showToast('Export Failed', 'Failed to generate adjustment history report: ' + error.message, 'error');
        }
    }

    async generateInventoryPDF(pieces, month, year) {
        if (!window.jspdf?.jsPDF) {
            this.showToast('Error', 'PDF library not loaded', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        const title = `Inventory Report - ${monthNames[month-1]} ${year}`;
        
        doc.setFontSize(16);
        doc.text(title, 150, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 10);
        
        const headers = [
            "ID", "Name", "Category", "Type", "Supplier", "Reference", 
            "Initial Stock", "Entries", "Exits", "Current Stock"
        ];
        
        const data = pieces.map(piece => [
            piece.id?.toString() || '',
            piece.name || '',
            piece.category || '',
            this.formatPieceType(piece.pieceType) || '',
            piece.supplier || '',
            piece.reference || '',
            piece.initialStock?.toString() || '0',
            piece.entries?.toString() || '0',
            piece.exits?.toString() || '0',
            piece.currentStock?.toString() || '0'
        ]);
        
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 25,
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 60, 114],
                textColor: 255,
                fontSize: 8
            },
            bodyStyles: { fontSize: 8 }
        });
        
        doc.save(`Inventory_Report_${monthNames[month-1]}_${year}.pdf`);
        this.showToast('Success', 'Inventory report generated successfully', 'success');
    }

    async generateAdjustmentHistoryPDF(adjustments) {
        if (!window.jspdf?.jsPDF) {
            this.showToast('Error', 'PDF library not loaded', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        doc.setFontSize(16);
        doc.text('Stock Adjustment History', 105, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 10);
        
        const headers = ["Date", "Piece", "Adjustment", "Old Stock", "New Stock", "Reason"];
        
        const data = adjustments.map(adj => {
            let dateStr = 'N/A';
            if (adj.date) {
                if (typeof adj.date === 'string') {
                    dateStr = new Date(adj.date).toLocaleDateString();
                } else if (Array.isArray(adj.date)) {
                    const [year, month, day] = adj.date;
                    dateStr = `${day}/${month}/${year}`;
                }
            }
            
            let reason = adj.reason || '';
            if (reason.includes('Ajustement:') && reason.includes(',')) {
                try {
                    reason = reason.substring(
                        reason.indexOf('Ajustement:') + 11, 
                        reason.indexOf(',', reason.indexOf('Ajustement:'))
                    ).trim();
                } catch (e) {
                    // Use full reason if extraction fails
                }
            }
            
            return [
                dateStr,
                adj.pieceName || '',
                adj.adjustment > 0 ? `+${adj.adjustment}` : adj.adjustment.toString(),
                adj.oldStock?.toString() || '',
                adj.newStock?.toString() || '',
                reason
            ];
        });
        
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 25,
            theme: 'striped',
            headStyles: { 
                fillColor: [30, 60, 114],
                textColor: 255,
                fontSize: 9
            },
            bodyStyles: { fontSize: 9 }
        });
        
        doc.save(`Stock_Adjustment_History_${new Date().toISOString().split('T')[0]}.pdf`);
        this.showToast('Success', 'Adjustment history report generated successfully', 'success');
    }

    async generateStudentDeclaration(student, response) {
        if (!window.jspdf?.jsPDF) {
            this.showToast('Warning', 'Cannot generate PDF - library not available', 'warning');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            // Header
            doc.setFontSize(22);
            doc.text('OrthoProConnect', 105, 15, { align: 'center' });
            
            doc.setFontSize(18);
            doc.text('RESPONSIBILITY DECLARATION', 105, 30, { align: 'center' });
            
            // Student info
            doc.setFontSize(12);
            doc.text('Student Name:', 20, 50);
            doc.setFont(undefined, 'bold');
            doc.text(student.fullName, 70, 50);
            doc.setFont(undefined, 'normal');
            
            doc.text('Student Code:', 20, 60);
            doc.setFont(undefined, 'bold');
            doc.text(student.studentCode, 70, 60);
            doc.setFont(undefined, 'normal');
            
            // QR Code placeholder
            doc.text('QR Code:', 20, 85);
            doc.setFontSize(10);
            doc.text('QR code available in the OrthoProConnect system', 30, 95);
            
            // Declaration text
            doc.setFontSize(12);
            const declarationText = 
                'I, the undersigned, declare that the barcode/QR code assigned to me is strictly personal ' +
                'and must not be shared with other people. I understand and accept that I am fully ' +
                'responsible for all items borrowed under my name and I commit to returning them within ' +
                'the agreed deadlines and in the condition they were borrowed. In case of loss, damage ' +
                'or non-return of an item, I accept to assume the corresponding financial responsibility ' +
                'according to the institution\'s rules.';
            
            const splitText = doc.splitTextToSize(declarationText, 170);
            doc.text(splitText, 20, 120);
            
            // Signature lines
            const signatureY = 120 + splitText.length * 6 + 20;
            doc.line(20, signatureY, 80, signatureY);
            doc.text('Student Signature', 20, signatureY + 5);
            
            doc.line(120, signatureY, 180, signatureY);
            doc.text('Date', 120, signatureY + 5);
            
            // Footer
            doc.setFontSize(10);
            doc.text('This document must be kept in the institution records.', 105, 250, { align: 'center' });
            doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 255, { align: 'center' });
            
            const fileName = `Declaration_${student.studentCode}_${student.fullName.replace(/\s+/g, '_')}.pdf`;
            doc.save(fileName);
            
            this.showToast('PDF Generated', 'Student declaration created successfully', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showToast('Error', 'Failed to generate PDF: ' + error.message, 'error');
        }
    }

    // Toast notifications
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InventoryManager();
});


