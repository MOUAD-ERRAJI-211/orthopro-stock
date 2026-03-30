
// Authentication Manager Class
class AuthenticationManager {
    constructor() {
        this.scanner = null;
        this.modal = null;
        this.redirectTo = null;
        this.init();
    }

    init() {
        this.getRedirectDestination();
        this.createQRModal();
        this.bindEvents();
    }

    getRedirectDestination() {
        const urlParams = new URLSearchParams(window.location.search);
        this.redirectTo = urlParams.get('redirect') || 'dashboard';
    }

    createQRModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'qr-modal';
        this.modal.innerHTML = `
                    <div class="qr-modal-content">
                        <div class="qr-modal-header">
                            <h2 class="qr-modal-title">Scan Student QR Code</h2>
                            <button class="close-modal-btn" id="close-modal">&times;</button>
                        </div>
                        <div class="qr-scanner-container">
                            <div class="scanner-placeholder" id="scanner-placeholder"></div>
                            <div class="scanner-overlay">
                                <div class="scanner-frame"></div>
                            </div>
                        </div>
                        <div class="scanner-instructions">
                            <p>Position the QR code within the frame to scan</p>
                        </div>
                    </div>
                `;
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        // QR Scanner button
        document.getElementById('scan-btn').addEventListener('click', () => {
            this.openQRModal();
        });

        // Login button
        document.getElementById('login-btn').addEventListener('click', () => {
            this.authenticateWithCode();
        });

        // Enter key on input
        document.getElementById('student-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.authenticateWithCode();
            }
        });

        // Close modal button
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeQRModal();
        });

        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeQRModal();
            }
        });
    }

    openQRModal() {
        this.modal.classList.add('active');
        setTimeout(() => this.initScanner(), 300);
    }

    closeQRModal() {
        if (this.scanner) {
            try {
                this.scanner.stop();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
            this.scanner = null;
        }
        this.modal.classList.remove('active');
    }

    initScanner() {
        if (this.scanner) {
            this.scanner.stop();
        }

        const placeholder = document.getElementById('scanner-placeholder');
        placeholder.innerHTML = '';

        this.scanner = new Html5Qrcode("scanner-placeholder");

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
        ).catch(error => {
            console.error("Error starting scanner:", error);
            this.showScannerError('Could not access camera. Please ensure camera permissions are granted.');
        });
    }

    onScanSuccess(decodedText) {
        console.log("QR code detected:", decodedText);

        if (this.scanner) {
            this.scanner.stop().then(() => {
                this.closeQRModal();
                this.authenticateWithQR(decodedText);
            }).catch(err => {
                console.error("Error stopping scanner:", err);
                this.closeQRModal();
                this.authenticateWithQR(decodedText);
            });
        } else {
            this.closeQRModal();
            this.authenticateWithQR(decodedText);
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

    async authenticateWithQR(qrData) {
        try {
            console.log("Authenticating with QR data:", qrData);
            this.clearError();
            this.showLoading();

            const studentData = await apiService.validateStudent(qrData);
            console.log("Authentication successful:", studentData);

            this.hideLoading();
            sessionStorage.setItem('currentStudent', JSON.stringify(studentData));
            this.redirectAfterAuth();
        } catch (error) {
            console.error("Authentication error:", error);
            this.hideLoading();
            this.showError('Invalid QR code. Please try again.');
        }
    }

    async authenticateWithCode() {
        const studentCode = document.getElementById('student-code').value.trim();

        if (!studentCode) {
            this.showError('Please enter a student code');
            return;
        }

        try {
            this.clearError();
            this.showLoading();

            const studentData = await apiService.validateStudentByCode(studentCode);

            this.hideLoading();
            sessionStorage.setItem('currentStudent', JSON.stringify(studentData));
            this.redirectAfterAuth();
        } catch (error) {
            this.hideLoading();
            this.showError('Invalid student code. Please try again.');
        }
    }

    redirectAfterAuth() {
        const routes = {
            'borrowing': '../borrowing/borrowing.html',
            'returning': '../returning/returning.html',
            'default': '../dashboard/dashboard.html'
        };

        const destination = routes[this.redirectTo] || routes.default;
        window.location.href = destination;
    }

    showLoading() {
        if (!document.querySelector('.loading-indicator')) {
            const loading = document.createElement('div');
            loading.className = 'loading-indicator';
            loading.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(loading);
        }
    }

    hideLoading() {
        const loading = document.querySelector('.loading-indicator');
        if (loading) {
            loading.remove();
        }
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
    }

    clearError() {
        document.getElementById('error-message').textContent = '';
    }
}

// Initialize authentication when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthenticationManager();
});
