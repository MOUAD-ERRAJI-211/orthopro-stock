
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
                        </div>
                        <div class="scanner-instructions">
                            <p>Position the QR code within the frame to scan</p>
                        </div>
                    </div>
                `;
        document.body.appendChild(this.modal);
    }

    bindEvents() {
        document.getElementById('scan-btn').addEventListener('click', () => {
            this.openQRModal();
        });

        document.getElementById('login-btn').addEventListener('click', () => {
            this.authenticateWithCode();
        });

        document.getElementById('student-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.authenticateWithCode();
            }
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeQRModal();
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeQRModal();
            }
        });
    }

    openQRModal() {
        this.modal.classList.add('active');
        setTimeout(() => this.initScanner(), 800);
    }

    closeQRModal() {
        if (this.scanner) {
            try { this.scanner.stop(); } catch (err) {}
            this.scanner = null;
        }
        this.modal.classList.remove('active');
    }

    initScanner() {
        if (this.scanner) {
            try { this.scanner.stop(); } catch(e) {}
            this.scanner = null;
        }

        const placeholder = document.getElementById('scanner-placeholder');
        placeholder.innerHTML = '';

        this.scanner = new Html5Qrcode("scanner-placeholder");

        const config = { fps: 10, qrbox: 250 };
        const onSuccess = (text) => this.onScanSuccess(text);
        const onError = () => {};

        Html5Qrcode.getCameras().then(cameras => {
            if (!cameras || cameras.length === 0) {
                placeholder.innerHTML = '<p style="color:red;padding:1rem;text-align:center">No camera found.</p>';
                return;
            }
            const camId = cameras[cameras.length - 1].id;
            this.scanner.start(camId, config, onSuccess, onError)
                .catch(e => {
                    placeholder.innerHTML = '<p style="color:red;padding:1rem;text-align:center">Camera error: ' + e + '</p>';
                });
        }).catch(e => {
            placeholder.innerHTML = '<p style="color:red;padding:1rem;text-align:center">Camera access denied. Please allow camera permissions.</p>';
        });
    }

    onScanSuccess(decodedText) {
        if (this.scanner) {
            this.scanner.stop().then(() => {
                this.closeQRModal();
                this.authenticateWithQR(decodedText);
            }).catch(() => {
                this.closeQRModal();
                this.authenticateWithQR(decodedText);
            });
        } else {
            this.closeQRModal();
            this.authenticateWithQR(decodedText);
        }
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
            this.clearError();
            this.showLoading();
            const studentData = await apiService.validateStudent(qrData);
            this.hideLoading();
            sessionStorage.setItem('currentStudent', JSON.stringify(studentData));
            this.redirectAfterAuth();
        } catch (error) {
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
        if (loading) loading.remove();
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
    }

    clearError() {
        document.getElementById('error-message').textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AuthenticationManager();
});

