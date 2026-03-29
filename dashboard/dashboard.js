class DashboardManager {
    constructor() {
        this.headerClickCount = 0;
        this.clickTimer = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupAdminToggle();
    }

    bindEvents() {
        // Card navigation
        document.getElementById('borrow-card').addEventListener('click', () => {
            window.location.href = '../authentication/auth.html?redirect=borrowing';
        });

        document.getElementById('return-card').addEventListener('click', () => {
            window.location.href = '../authentication/auth.html?redirect=returning';
        });

        document.getElementById('inventory-card').addEventListener('click', () => {
            window.location.href = '../inventory/inventory.html';
        });

        document.getElementById('history-card').addEventListener('click', () => {
            window.location.href = '../history/history.html';
        });
    }

    setupAdminToggle() {
        const header = document.getElementById('header');
        const inventoryCard = document.getElementById('inventory-card');
        const historyCard = document.getElementById('history-card');

        header.addEventListener('click', (e) => {
            this.headerClickCount++;

            // Reset counter after 1 second
            clearTimeout(this.clickTimer);
            this.clickTimer = setTimeout(() => {
                this.headerClickCount = 0;
            }, 1000);

            // Toggle cards after 1 click
            if (this.headerClickCount === 1) {
                this.toggleAdminCards(inventoryCard, historyCard);
                this.headerClickCount = 0;
            }
        });
    }

    toggleAdminCards(inventoryCard, historyCard) {
        const isHidden = inventoryCard.classList.contains('hidden');

        if (isHidden) {
            inventoryCard.classList.remove('hidden');
            historyCard.classList.remove('hidden');
        } else {
            inventoryCard.classList.add('hidden');
            historyCard.classList.add('hidden');
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});