
class BorrowingManager {
    constructor() {
        this.currentStudent = null;
        this.allPieces = [];
        this.selectedPiece = null;
        this.scanner = null;
        this.qrModal = null;
        this.borrowModal = null;
        this.init();
    }

    async init() {
        try {
            this.checkAuthentication();
            this.initializeElements();
            this.bindEvents();
            await this.loadAllPieces();
        } catch (error) {
            console.error('Error initializing borrowing manager:', error);
            this.showNotification('Failed to initialize. Please refresh the page.', 'error');
        }
    }

    checkAuthentication() {
        const studentData = sessionStorage.getItem('currentStudent');
        if (!studentData) {
            this.showNotification('Please authenticate to access this page.', 'error');
            setTimeout(() => {
                window.location.href = '../authentication/auth.html?redirect=borrowing';
            }, 2000);
            return;
        }
        this.currentStudent = JSON.parse(studentData);
    }

    initializeElements() {
        this.qrModal = document.getElementById('qr-modal');
        this.borrowModal = document.getElementById('borrow-modal');
    }

    bindEvents() {
        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = '../dashboard/dashboard.html';
        });

        // QR Scanner
        document.getElementById('scan-btn').addEventListener('click', () => {
            this.openQRScanner();
        });

        document.getElementById('close-qr-modal').addEventListener('click', () => {
            this.closeQRScanner();
        });

        // Manual input
        document.getElementById('submit-btn').addEventListener('click', () => {
            this.processManualInput();
        });

        document.getElementById('qr-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processManualInput();
            }
        });

        // Clear selection
        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.clearSelection();
        });

        // Borrow modal
        document.getElementById('close-borrow-modal').addEventListener('click', () => {
            this.closeBorrowModal();
        });

        document.getElementById('confirm-borrow-btn').addEventListener('click', () => {
            this.confirmBorrow();
        });

        // Modal click outside to close
        this.qrModal.addEventListener('click', (e) => {
            if (e.target === this.qrModal) {
                this.closeQRScanner();
            }
        });

        this.borrowModal.addEventListener('click', (e) => {
            if (e.target === this.borrowModal) {
                this.closeBorrowModal();
            }
        });
    }

    async loadAllPieces() {
        try {
            const itemsGrid = document.getElementById('items-grid');
            itemsGrid.innerHTML = `
                        <div class="loading-state">
                            <div class="loading-spinner"></div>
                            <p class="loading-text">Loading available equipment...</p>
                        </div>
                    `;

            this.allPieces = await apiService.getAllPieces();

            if (!this.allPieces || this.allPieces.length === 0) {
                this.showEmptyState();
                return;
            }

            this.displayAllPieces();
            this.updateItemsSubtitle(this.allPieces.length);
        } catch (error) {
            console.error('Error loading pieces:', error);
            this.showErrorState('Failed to load equipment. Please try again.');
        }
    }

    displayAllPieces() {
        const itemsGrid = document.getElementById('items-grid');
        itemsGrid.innerHTML = '';

        this.allPieces.forEach(piece => {
            const itemCard = this.createItemCard(piece);
            itemsGrid.appendChild(itemCard);
        });
    }

    getFullImageUrl(imageUrl) {
        if (!imageUrl) return '';
        if (imageUrl.startsWith('http')) return imageUrl;
        if (!imageUrl.startsWith('/')) imageUrl = '/' + imageUrl;
        const baseUrl = typeof API_CONFIG !== 'undefined' ? API_CONFIG.BASE_URL : window.location.origin;
        return baseUrl + imageUrl;
    }

    createItemCard(piece) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.onclick = () => this.openBorrowModal(piece);

        const stockClass = piece.currentStock <= 0 ? 'critical' :
            piece.currentStock <= 5 ? 'low' : '';

        const stockText = piece.currentStock <= 0 ? 'Out of Stock' :
            `${piece.currentStock} available`;

        const imgUrl = this.getFullImageUrl(piece.imageUrl);

        card.innerHTML = `
                    <div class="item-image">
                        ${imgUrl ?
                `<img src="${imgUrl}" alt="${piece.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <i class="material-icons" style="display: none;">inventory_2</i>` :
                `<i class="material-icons">inventory_2</i>`
            }
                    </div>
                    <div class="item-info">
                        <h3 class="item-name">${piece.name}</h3>
                        <div class="item-category">${piece.category}${piece.subcategory ? ` - ${piece.subcategory}` : ''}</div>
                        <div class="item-details">
                            <div class="detail-row">
                                <span class="detail-label">Location:</span>
                                <span class="detail-value">${piece.location || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Reference:</span>
                                <span class="detail-value">${piece.reference || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <div class="stock-indicator">
                                <div class="stock-dot ${stockClass}"></div>
                                <span>${stockText}</span>
                            </div>
                            <button class="borrow-btn" ${piece.currentStock <= 0 ? 'disabled' : ''}>
                                <svg class="borrow-icon" viewBox="0 0 24 24">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                </svg>
                                Borrow
                            </button>
                        </div>
                    </div>
                `;

        return card;
    }

    openQRScanner() {
        this.qrModal.classList.add('active');
        setTimeout(() => this.initScanner(), 300);
    }

    closeQRScanner() {
        if (this.scanner) {
            try {
                this.scanner.stop().then(() => {
                    this.scanner = null;
                }).catch(err => {
                    console.error("Error stopping scanner:", err);
                    this.scanner = null;
                });
            } catch (err) {
                console.error("Error stopping scanner:", err);
                this.scanner = null;
            }
        }
        this.qrModal.classList.remove('active');
    }

    initScanner() {
        if (this.scanner) {
            try { this.scanner.stop(); } catch(e) {}
            this.scanner = null;
        }

        const placeholder = document.getElementById('scanner-placeholder');
        placeholder.innerHTML = '';

        this.scanner = new Html5Qrcode("scanner-placeholder");
        const config2 = { fps: 10, qrbox: { width: 250, height: 250 } };
        Html5Qrcode.getCameras().then(cameras => {
            if (!cameras || cameras.length === 0) { placeholder.innerHTML = '<p style="color:red;padding:1rem">No camera found.</p>'; return; }
            const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
            this.scanner.start(cam.id, config2, (t) => this.onQRScanSuccess(t), () => {}).catch(e => { placeholder.innerHTML = '<p style="color:red;padding:1rem">Camera error: ' + e + '</p>'; });
        }).catch(e => { placeholder.innerHTML = '<p style="color:red;padding:1rem">Camera access denied.</p>'; });
        // original config kept below for reference
        // Use getCameras for PC compatibility — see initScanner override below

        const config = {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            rememberLastUsedCamera: true
        };

        this.scanner.start(
            { facingMode: "environment" },
            config,
            (decodedText) => this.onScanSuccess(decodedText),
            (error) => this.onScanFailure(error)
        ).catch(() => {
            this.scanner.start(
                { facingMode: "user" },
                config,
                (decodedText) => this.onScanSuccess(decodedText),
                (error) => this.onScanFailure(error)
            ).catch(err2 => {
                console.error("Error starting scanner:", err2);
                this.showScannerError('Could not access camera. Please ensure camera permissions are granted.');
            });
        });
    }

    onScanSuccess(decodedText) {
        console.log("QR code detected:", decodedText);

        if (this.scanner) {
            this.scanner.stop().then(() => {
                this.scanner = null;
                this.closeQRScanner();
                this.processQRCode(decodedText);
            }).catch(err => {
                console.error("Error stopping scanner:", err);
                this.scanner = null;
                this.closeQRScanner();
                this.processQRCode(decodedText);
            });
        } else {
            this.closeQRScanner();
            this.processQRCode(decodedText);
        }
    }

    onScanFailure(error) {
        // Suppress routine scanning errors
        console.warn(`QR scan error: ${error}`);
    }

    showScannerError(message) {
        const placeholder = document.getElementById('scanner-placeholder');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'scanner-error';
        errorDiv.textContent = message;
        placeholder.appendChild(errorDiv);
    }

    async processManualInput() {
        const qrInput = document.getElementById('qr-input');
        const qrCode = qrInput.value.trim();

        if (!qrCode) {
            this.showNotification('Please enter a QR code', 'error');
            return;
        }

        await this.processQRCode(qrCode);
        qrInput.value = '';
    }

    async processQRCode(qrCode) {
        try {
            this.showNotification('Searching for equipment...', 'info');

            const piece = await apiService.getPieceByQrCode(qrCode);

            if (!piece) {
                this.showNotification('No equipment found with this QR code', 'error');
                return;
            }

            this.selectedPiece = piece;
            this.displaySelectedItem(piece);
            this.showNotification('Equipment found!', 'success');
        } catch (error) {
            console.error('Error processing QR code:', error);
            this.showNotification('Error finding equipment. Please try again.', 'error');
        }
    }

    displaySelectedItem(piece) {
        const selectedSection = document.getElementById('selected-item-section');
        const selectedContent = document.getElementById('selected-item-content');

        const stockClass = piece.currentStock <= 0 ? 'critical' :
            piece.currentStock <= 5 ? 'low' : '';

        const stockText = piece.currentStock <= 0 ? 'Out of Stock' :
            `${piece.currentStock} available`;

        selectedContent.innerHTML = `
                    <div class="item-card" style="cursor: pointer;" onclick="borrowingManager.openBorrowModal(borrowingManager.selectedPiece)">
                        <div class="item-image">
                            ${piece.imageUrl ?
                `<img src="${piece.imageUrl}" alt="${piece.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <i class="material-icons" style="display: none;">inventory_2</i>` :
                `<i class="material-icons">inventory_2</i>`
            }
                        </div>
                        <div class="item-info">
                            <h3 class="item-name">${piece.name}</h3>
                            <div class="item-category">${piece.category}${piece.subcategory ? ` - ${piece.subcategory}` : ''}</div>
                            <div class="item-details">
                                <div class="detail-row">
                                    <span class="detail-label">Location:</span>
                                    <span class="detail-value">${piece.location || 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Reference:</span>
                                    <span class="detail-value">${piece.reference || 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">QR Code:</span>
                                    <span class="detail-value">${piece.qrCode || 'N/A'}</span>
                                </div>
                            </div>
                            <div class="item-actions">
                                <div class="stock-indicator">
                                    <div class="stock-dot ${stockClass}"></div>
                                    <span>${stockText}</span>
                                </div>
                                <button class="borrow-btn" ${piece.currentStock <= 0 ? 'disabled' : ''}>
                                    <svg class="borrow-icon" viewBox="0 0 24 24">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                    </svg>
                                    Borrow Now
                                </button>
                            </div>
                        </div>
                    </div>
                `;

        selectedSection.style.display = 'block';
        selectedSection.scrollIntoView({ behavior: 'smooth' });
    }

    clearSelection() {
        this.selectedPiece = null;
        document.getElementById('selected-item-section').style.display = 'none';
        this.showNotification('Selection cleared', 'info');
    }

    openBorrowModal(piece) {
        if (piece.currentStock <= 0) {
            this.showNotification('This equipment is out of stock', 'error');
            return;
        }

        this.selectedPiece = piece;
        this.setupBorrowModal(piece);
        this.borrowModal.classList.add('active');
    }

    closeBorrowModal() {
        this.borrowModal.classList.remove('active');
    }

    setupBorrowModal(piece) {
        // Setup modal item details
        const modalDetails = document.getElementById('modal-item-details');
        const modalImgUrl = this.getFullImageUrl(piece.imageUrl);
        modalDetails.innerHTML = `
                    <div class="modal-item-image">
                        ${modalImgUrl ?
                `<img src="${modalImgUrl}" alt="${piece.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <i class="material-icons" style="display: none;">inventory_2</i>` :
                `<i class="material-icons">inventory_2</i>`
            }
                    </div>
                    <div class="modal-item-info">
                        <h3 class="modal-item-name">${piece.name}</h3>
                        <p class="modal-item-category">${piece.category}${piece.subcategory ? ` - ${piece.subcategory}` : ''}</p>
                        <p class="modal-item-stock">Available: ${piece.currentStock}</p>
                    </div>
                `;

        // Setup form defaults
        const quantityInput = document.getElementById('quantity-input');
        const returnDateInput = document.getElementById('return-date-input');
        const additionalStudentsInput = document.getElementById('additional-students-input');
        const notesInput = document.getElementById('notes-input');

        quantityInput.value = 1;
        quantityInput.max = piece.currentStock;

        // Set default return date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        returnDateInput.value = tomorrow.toISOString().split('T')[0];

        additionalStudentsInput.value = '';
        notesInput.value = '';
    }

    async confirmBorrow() {
        if (!this.selectedPiece) return;

        const quantityInput = document.getElementById('quantity-input');
        const returnDateInput = document.getElementById('return-date-input');
        const additionalStudentsInput = document.getElementById('additional-students-input');
        const notesInput = document.getElementById('notes-input');
        const confirmBtn = document.getElementById('confirm-borrow-btn');

        const quantity = parseInt(quantityInput.value);
        if (isNaN(quantity) || quantity <= 0 || quantity > this.selectedPiece.currentStock) {
            this.showNotification('Please enter a valid quantity', 'error');
            return;
        }

        const returnDate = returnDateInput.value;
        if (!returnDate) {
            this.showNotification('Please select an expected return date', 'error');
            return;
        }

        // Parse additional students
        let additionalStudents = [];
        if (additionalStudentsInput.value.trim()) {
            additionalStudents = additionalStudentsInput.value.split(',')
                .map(code => code.trim())
                .filter(code => code.length > 0);
        }

        try {
            // Show loading state
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Processing...';

            const checkoutData = {
                studentCode: this.currentStudent.studentCode,
                items: [{
                    pieceId: this.selectedPiece.id,
                    quantity: quantity,
                    expectedReturnDate: returnDate + 'T23:59:59'
                }],
                additionalStudents: additionalStudents,
                notes: notesInput.value.trim(),
                authorizedBy: 'SELF_CHECKOUT'
            };

            const response = await apiService.createCheckout(checkoutData);

            if (response.successful > 0) {
                this.showNotification('Equipment borrowed successfully!', 'success');
                this.closeBorrowModal();
                this.clearSelection();

                // Refresh the pieces to update stock
                await this.loadAllPieces();
            } else {
                this.showNotification(`Failed to borrow: ${response.errors.join(', ')}`, 'error');
            }

        } catch (error) {
            console.error('Error during checkout:', error);
            this.showNotification('Failed to borrow equipment. Please try again.', 'error');
        } finally {
            // Reset button
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Borrow';
        }
    }

    updateItemsSubtitle(count) {
        const subtitle = document.getElementById('items-subtitle');
        subtitle.textContent = `${count} items available for borrowing`;
    }

    showEmptyState() {
        const itemsGrid = document.getElementById('items-grid');
        itemsGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="material-icons">inventory_2</i>
                        <h3>No Equipment Available</h3>
                        <p>There are currently no items available for borrowing.</p>
                    </div>
                `;
    }

    showErrorState(message) {
        const itemsGrid = document.getElementById('items-grid');
        itemsGrid.innerHTML = `
                    <div class="error-state">
                        <i class="material-icons">error</i>
                        <h3>Error Loading Equipment</h3>
                        <p>${message}</p>
                    </div>
                `;
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const icon = type === 'success' ? 'check_circle' :
            type === 'error' ? 'error' :
                type === 'info' ? 'info' : 'check_circle';

        notification.innerHTML = `
                    <i class="material-icons">${icon}</i>
                    <span>${message}</span>
                `;

        document.body.appendChild(notification);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(100%)';
                notification.style.opacity = '0';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 4000);
    }
}

// Initialize the borrowing manager when DOM is loaded
let borrowingManager;
document.addEventListener('DOMContentLoaded', () => {
    borrowingManager = new BorrowingManager();
});





