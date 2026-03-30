class ReturnItemsManager {
    constructor() {
        this.currentStudent = null;
        this.borrowedItems = [];
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.bindEvents();
        this.loadBorrowedItems();
    }

    checkAuthentication() {
        const studentData = sessionStorage.getItem('currentStudent');
        if (!studentData) {
            alert('Please authenticate to access this page.');
            window.location.href = '../authentication/auth.html?redirect=returning';
            return;
        }
        this.currentStudent = JSON.parse(studentData);
    }

    bindEvents() {
        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            window.location.href = '../dashboard/dashboard.html';
        });

        // Borrow button (in empty state)
        const borrowBtn = document.getElementById('borrow-btn');
        if (borrowBtn) {
            borrowBtn.addEventListener('click', () => {
                window.location.href = '../authentication/auth.html?redirect=borrowing';
            });
        }
    }

    async loadBorrowedItems() {
        try {
            this.showLoading();

            // Use the actual API call
            const activeCheckouts = await apiService.getStudentActiveCheckouts(this.currentStudent.id);

            this.hideLoading();

            if (!activeCheckouts || activeCheckouts.length === 0) {
                this.showEmptyState();
                return;
            }

            // Filter out consumable items - they don't need to be returned
            const returnableItems = [];
            const consumedItems = [];

            // Fetch piece details to check if items are consumable
            for (const checkout of activeCheckouts) {
                try {
                    const piece = await apiService.getPieceById(checkout.piece.id);

                    if (piece.pieceType === 'CONSUMABLE') {
                        consumedItems.push({ ...checkout, piece: piece });
                    } else {
                        returnableItems.push({ ...checkout, piece: piece });
                    }
                } catch (error) {
                    console.error('Error fetching piece details:', error);
                    // If we can't get piece details, assume it's returnable to be safe
                    returnableItems.push(checkout);
                }
            }

            // If no returnable items, show empty state
            if (returnableItems.length === 0) {
                this.showEmptyState(consumedItems.length);
                return;
            }

            this.borrowedItems = returnableItems;
            this.showItemsContainer();
            this.renderBorrowedItems(returnableItems);
            this.updateItemCount(returnableItems.length);

            // Show info about consumed items if any
            if (consumedItems.length > 0) {
                this.showConsumableInfo(consumedItems.length);
            }

        } catch (error) {
            console.error('Error loading borrowed items:', error);
            this.hideLoading();
            this.showError('Failed to load borrowed items. Please try again.');
        }
    }

    renderBorrowedItems(items) {
        const container = document.getElementById('return-items-container');

        container.innerHTML = items.map((checkout, index) => {
            // Check if item is overdue
            const isOverdue = checkout.expectedReturnDate && new Date(checkout.expectedReturnDate) < new Date();
            const daysInfo = this.calculateDaysInfo(checkout.expectedReturnDate);

            // Parse additional students
            let additionalStudentsHtml = '';
            if (checkout.additionalStudents) {
                try {
                    const additionalStudents = JSON.parse(checkout.additionalStudents);
                    if (additionalStudents && additionalStudents.length > 0) {
                        additionalStudentsHtml = `
                            <div class="detail-item">
                                <svg class="detail-icon" viewBox="0 0 24 24">
                                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16.5c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5H18v5h2zM12.5 11.5c.83 0 1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5h-3c-.83 0-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5h3zM7 18v-6H4.5l2.54-7.63A1.5 1.5 0 0 1 8.46 8h1.04c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H8v5H7z"/>
                                </svg>
                                <span class="detail-label">Additional students:</span>
                                <span class="detail-value">${additionalStudents.join(', ')}</span>
                            </div>
                        `;
                    }
                } catch (e) {
                    if (checkout.additionalStudents && checkout.additionalStudents.trim()) {
                        additionalStudentsHtml = `
                            <div class="detail-item">
                                <svg class="detail-icon" viewBox="0 0 24 24">
                                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16.5c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5H18v5h2zM12.5 11.5c.83 0 1.5-.67 1.5-1.5v-4c0-.83-.67-1.5-1.5-1.5h-3c-.83 0-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5h3zM7 18v-6H4.5l2.54-7.63A1.5 1.5 0 0 1 8.46 8h1.04c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5H8v5H7z"/>
                                </svg>
                                <span class="detail-label">Additional students:</span>
                                <span class="detail-value">${checkout.additionalStudents}</span>
                            </div>
                        `;
                    }
                }
            }

            return `
                <div class="item-card slide-up ${daysInfo.urgent ? 'urgent-item' : ''}" 
                     data-item-id="${checkout.id}" 
                     style="animation-delay: ${index * 0.1}s">
                    <div class="item-header">
                        <div class="item-info">
                            <h3 class="item-name">${checkout.piece?.name || 'Unknown Item'}</h3>
                            <span class="item-category">${checkout.piece?.category || 'N/A'}${checkout.piece?.subcategory ? ` - ${checkout.piece?.subcategory}` : ''}</span>
                        </div>
                        <span class="status-indicator status-${daysInfo.status}">
                            ${daysInfo.status === 'overdue' ? 'Overdue' : 'Borrowed'}
                        </span>
                    </div>
                    
                    ${daysInfo.urgent ? `
                        <div class="urgent-notice">
                            <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5h-2v6h2V7zm0 8h-2v2h2v-2z"/>
                            </svg>
                            ${daysInfo.text}
                        </div>
                    ` : ''}
                    
                    <div class="item-details">
                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                            </svg>
                            <span class="detail-label">Quantity:</span>
                            <span class="detail-value">${Math.abs(checkout.quantity) || 1}</span>
                        </div>
                        
                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24">
                                <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3v2h18V4zM3 8v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8H3z"/>
                            </svg>
                            <span class="detail-label">Borrowed:</span>
                            <span class="detail-value">${this.formatDate(checkout.checkoutDate)}</span>
                        </div>
                        
                        <div class="detail-item">
                            <svg class="detail-icon" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span class="detail-label">Due:</span>
                            <span class="detail-value">${this.formatDate(checkout.expectedReturnDate)}</span>
                        </div>
                        
                        ${additionalStudentsHtml}
                    </div>
                    
                    <button class="return-btn" onclick="returnItemsManager.returnItem('${checkout.id}')">
                        <svg class="return-icon" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        Return Item
                    </button>
                </div>
            `;
        }).join('');
    }

    async returnItem(transactionId) {
        try {
            const confirmReturn = confirm('Are you sure you want to return this item?');
            if (!confirmReturn) return;

            const itemCard = document.querySelector(`[data-item-id="${transactionId}"]`);
            const returnBtn = itemCard.querySelector('.return-btn');

            // Show loading state on button
            this.setReturnButtonLoading(returnBtn);

            const returnData = {
                studentCode: this.currentStudent.studentCode,
                transactionIds: [transactionId],
                notes: 'Returned via self-service',
                authorizedBy: 'SELF_RETURN'
            };

            const response = await apiService.returnItems(returnData);

            if (response.successful > 0) {
                this.handleSuccessfulReturn(transactionId, itemCard);
            } else {
                this.showError(`Failed to return item: ${response.errors.join(', ')}`);
                this.resetReturnButton(itemCard);
            }
        } catch (error) {
            console.error('Error returning item:', error);
            this.showError('Failed to return item. Please try again.');

            const itemCard = document.querySelector(`[data-item-id="${transactionId}"]`);
            if (itemCard) {
                this.resetReturnButton(itemCard);
            }
        }
    }

    // Utility methods from the enhanced version
    showLoading() {
        document.getElementById('loading-state').style.display = 'flex';
        document.getElementById('empty-state').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading-state').style.display = 'none';
    }

    showEmptyState(consumedItemsCount = 0) {
        const container = document.getElementById('return-items-container');
        container.innerHTML = '';
        const emptyState = document.getElementById('empty-state');
        emptyState.style.display = 'flex';
        emptyState.classList.add('fade-in');

        // Update message if there are consumed items
        if (consumedItemsCount > 0) {
            const description = emptyState.querySelector('.empty-description');
            description.textContent = `You don't have any items to return. You have ${consumedItemsCount} consumable item(s) that don't need to be returned.`;
        }
    }

    showItemsContainer() {
        document.getElementById('return-items-container').style.display = 'block';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('loading-state').style.display = 'none';
    }

    updateItemCount(count) {
        const subtitle = document.querySelector('.section-subtitle');
        if (count > 0) {
            subtitle.textContent = `You have ${count} item${count !== 1 ? 's' : ''} to return`;
        } else {
            subtitle.textContent = 'Review and return your borrowed equipment';
        }
    }

    showConsumableInfo(count) {
        const container = document.getElementById('return-items-container');
        const infoMessage = document.createElement('div');
        infoMessage.className = 'consumable-info';
        infoMessage.innerHTML = `
            <div class="info-content">
                <svg style="width: 20px; height: 20px; fill: #3182ce; margin-right: 0.5rem;" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5h-2v6h2V7zm0 8h-2v2h2v-2z"/>
                </svg>
                <span>You have ${count} consumable item(s) that don't need to be returned.</span>
            </div>
        `;
        infoMessage.style.cssText = `
            background: rgba(49, 130, 206, 0.1);
            border: 1px solid rgba(49, 130, 206, 0.2);
            border-radius: var(--radius-md);
            padding: 1rem;
            margin-top: 1rem;
            color: var(--text-primary);
        `;
        container.appendChild(infoMessage);
    }

    handleSuccessfulReturn(itemId, itemCard) {
        this.showNotification('Item returned successfully!');

        // Animate item removal
        itemCard.style.transform = 'translateX(100%)';
        itemCard.style.opacity = '0';

        setTimeout(() => {
            itemCard.remove();
            this.borrowedItems = this.borrowedItems.filter(item => item.id !== itemId);

            // Update item count
            this.updateItemCount(this.borrowedItems.length);

            // Check if no items left
            if (this.borrowedItems.length === 0) {
                setTimeout(() => {
                    this.showEmptyState();
                }, 300);
            }
        }, 300);
    }

    resetReturnButton(itemCard) {
        const returnBtn = itemCard.querySelector('.return-btn');
        returnBtn.disabled = false;
        returnBtn.innerHTML = `
            <svg class="return-icon" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            Return Item
        `;
    }

    setReturnButtonLoading(returnBtn) {
        returnBtn.disabled = true;
        returnBtn.innerHTML = `
            <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            Returning...
        `;
    }

    showNotification(message) {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.background = 'var(--danger-gradient)';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <svg style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5h-2v6h2V7zm0 8h-2v2h2v-2z"/>
                </svg>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 4000);
    }

    calculateDaysInfo(dueDate) {
        if (!dueDate) return { status: 'borrowed', text: 'No due date', urgent: false };

        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                status: 'overdue',
                text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`,
                urgent: true
            };
        } else if (diffDays === 0) {
            return {
                status: 'due-today',
                text: 'Due today',
                urgent: true
            };
        } else if (diffDays <= 3) {
            return {
                status: 'due-soon',
                text: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
                urgent: false
            };
        } else {
            return {
                status: 'borrowed',
                text: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
                urgent: false
            };
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize the return items manager when DOM is loaded
let returnItemsManager;
document.addEventListener('DOMContentLoaded', () => {
    returnItemsManager = new ReturnItemsManager();
});
