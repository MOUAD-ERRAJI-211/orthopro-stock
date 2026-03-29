document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const searchBtn = document.getElementById('search-btn');
    const scanBtn = document.getElementById('scan-btn');
    const studentSearchInput = document.getElementById('student-search');
    const errorMessage = document.getElementById('error-message');
    const studentInfo = document.getElementById('student-info');
    const studentName = document.getElementById('student-name');
    const studentCode = document.getElementById('student-code');
    const studentClass = document.getElementById('student-class');
    const totalCount = document.getElementById('total-count');
    const checkoutCount = document.getElementById('checkout-count');
    const returnCount = document.getElementById('return-count');
    const pendingCount = document.getElementById('pending-count');

    // Items sections and tabs
    const pendingTab = document.getElementById('pending-tab');
    const returnedTab = document.getElementById('returned-tab');
    const pendingSection = document.getElementById('pending-section');
    const returnedSection = document.getElementById('returned-section');
    const pendingBadge = document.getElementById('pending-badge');
    const returnedBadge = document.getElementById('returned-badge');
    const pendingItemsGrid = document.getElementById('pending-items-grid');
    const returnedItemsGrid = document.getElementById('returned-items-grid');
    const noPendingItems = document.getElementById('no-pending-items');
    const noReturnedItems = document.getElementById('no-returned-items');
    const loadingSpinner = document.getElementById('loading-spinner');

    // QR Scanner Elements
    const qrModal = document.getElementById('qr-modal');
    const closeModalBtn = document.getElementById('close-modal');
    let scanner = null;

    // Current student code
    let currentStudentCode = null;

    // Event Listeners
    if (searchBtn) {
        searchBtn.addEventListener('click', searchStudent);
    }

    if (studentSearchInput) {
        studentSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchStudent();
            }
        });
    }

    if (scanBtn) {
        scanBtn.addEventListener('click', openQrScanner);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeQrScanner);
    }

    // Tab switching event listeners
    if (pendingTab) {
        pendingTab.addEventListener('click', function () {
            activateTab('pending');
        });
    }

    if (returnedTab) {
        returnedTab.addEventListener('click', function () {
            activateTab('returned');
        });
    }

    // QR modal click outside to close
    if (qrModal) {
        qrModal.addEventListener('click', function (e) {
            if (e.target === qrModal) {
                closeQrScanner();
            }
        });
    }

    // Function to switch between tabs
    function activateTab(tabName) {
        if (tabName === 'pending') {
            if (pendingTab) pendingTab.classList.add('active');
            if (returnedTab) returnedTab.classList.remove('active');
            if (pendingSection) pendingSection.classList.add('active');
            if (returnedSection) returnedSection.classList.remove('active');
        } else {
            if (pendingTab) pendingTab.classList.remove('active');
            if (returnedTab) returnedTab.classList.add('active');
            if (pendingSection) pendingSection.classList.remove('active');
            if (returnedSection) returnedSection.classList.add('active');
        }
    }

    // Initialize QR Scanner
    function initScanner() {
        if (scanner) {
            scanner.stop();
        }

        const placeholder = document.getElementById('scanner-placeholder');
        if (!placeholder) return;

        placeholder.innerHTML = '';

        scanner = new Html5Qrcode("scanner-placeholder");

        const config = {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            rememberLastUsedCamera: true
        };

        scanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).catch(error => {
            console.error("Error starting scanner:", error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'scanner-error';
            errorDiv.textContent = 'Could not access camera. Please ensure camera permissions are granted.';
            placeholder.appendChild(errorDiv);
        });
    }

    function onScanSuccess(decodedText) {
        console.log("QR code detected:", decodedText);

        if (scanner) {
            scanner.stop().then(() => {
                console.log("Scanner stopped successfully");
                closeQrScanner();
                findStudentByQrCode(decodedText);
            }).catch(err => {
                console.error("Error stopping scanner:", err);
                closeQrScanner();
                findStudentByQrCode(decodedText);
            });
        } else {
            closeQrScanner();
            findStudentByQrCode(decodedText);
        }
    }

    function onScanFailure(error) {
        console.warn(`QR scan error: ${error}`);
    }

    function openQrScanner() {
        if (qrModal) {
            qrModal.classList.add('active');
            setTimeout(initScanner, 300);
        }
    }

    function closeQrScanner() {
        if (scanner) {
            try {
                scanner.stop();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
        if (qrModal) {
            qrModal.classList.remove('active');
        }
    }

    // Find student by QR code
    async function findStudentByQrCode(qrData) {
        try {
            clearErrorMessage();
            showLoading();

            const studentData = await apiService.validateStudent(qrData);

            if (studentData && studentData.studentCode) {
                await fetchStudentHistory(studentData.studentCode);
            } else {
                showErrorMessage('Invalid QR code. Please try a different code.');
                hideLoading();
            }
        } catch (error) {
            console.error('Error finding student by QR code:', error);
            showErrorMessage('Error scanning QR code. Please try again or search by name/code.');
            hideLoading();
        }
    }

    // Search student by name or code
    async function searchStudent() {
        if (!studentSearchInput) return;

        const searchTerm = studentSearchInput.value.trim();

        if (!searchTerm) {
            showErrorMessage('Please enter a student name or code');
            return;
        }

        clearErrorMessage();
        showLoading();

        try {
            // Try to find by exact student code first
            try {
                const student = await apiService.getStudentByCode(searchTerm);
                if (student) {
                    await fetchStudentHistory(student.studentCode);
                    return;
                }
            } catch (err) {
                console.log('Not found by exact code, searching by name...');
            }

            // Search by name
            const students = await apiService.searchStudents(searchTerm);

            if (students && students.length > 0) {
                await fetchStudentHistory(students[0].studentCode);
            } else {
                showErrorMessage('No students found matching your search');
                hideStudentInfo();
                hideLoading();
            }
        } catch (error) {
            console.error('Error searching for student:', error);
            showErrorMessage('Error searching for student. Please try again.');
            hideStudentInfo();
            hideLoading();
        }
    }

    // Fetch student history data
    async function fetchStudentHistory(studentCode) {
        showLoading();
        clearErrorMessage();

        try {
            currentStudentCode = studentCode;

            // Always fetch all history (3650 days = ~10 years)
            const historyData = await apiService.getStudentHistory(studentCode, 3650);

            if (historyData && historyData.student) {
                updateStudentInfo(historyData.student);
                await updateHistoryDisplay(historyData.history);
                updateStatistics(historyData.history);

                if (studentInfo) {
                    studentInfo.classList.remove('hidden');
                    studentInfo.classList.add('show');
                }
            } else {
                showErrorMessage('No history found for this student');
                hideStudentInfo();
            }

            hideLoading();
        } catch (error) {
            console.error('Error fetching student history:', error);
            showErrorMessage('Error fetching student history. Please try again.');
            hideStudentInfo();
            hideLoading();
        }
    }

    // Update student info section
    function updateStudentInfo(student) {
        if (!student) {
            console.error('No student data received');
            return;
        }

        if (studentName) studentName.textContent = student.fullName || 'N/A';
        if (studentCode) studentCode.textContent = student.studentCode || 'N/A';
        if (studentClass) studentClass.textContent = student.classGroup || 'N/A';
    }

    async function updateHistoryDisplay(transactions) {
        if (pendingItemsGrid) pendingItemsGrid.innerHTML = '';
        if (returnedItemsGrid) returnedItemsGrid.innerHTML = '';

        if (!transactions || transactions.length === 0) {
            if (noPendingItems) noPendingItems.classList.remove('hidden');
            if (noReturnedItems) noReturnedItems.classList.remove('hidden');
            if (pendingBadge) pendingBadge.textContent = '0';
            if (returnedBadge) returnedBadge.textContent = '0';
            return;
        }

        const pieceInfoMap = new Map();
        const piecesToFetch = [];

        transactions.forEach(transaction => {
            if (transaction.piece && transaction.piece.id && !transaction.piece.name) {
                if (!pieceInfoMap.has(transaction.piece.id)) {
                    piecesToFetch.push(transaction.piece.id);
                }
            }
        });

        if (piecesToFetch.length > 0) {
            showLoading();
            try {
                const piecePromises = piecesToFetch.map(pieceId =>
                    apiService.getPieceById(pieceId)
                        .then(piece => {
                            pieceInfoMap.set(pieceId, piece);
                            return piece;
                        })
                        .catch(error => {
                            console.error(`Error fetching piece #${pieceId}:`, error);
                            return null;
                        })
                );

                await Promise.all(piecePromises);
            } catch (error) {
                console.error('Error fetching piece information:', error);
            } finally {
                hideLoading();
            }
        }

        // Sort transactions by date (most recent first)
        transactions.sort((a, b) => {
            if (Array.isArray(a.transactionDate) && Array.isArray(b.transactionDate)) {
                for (let i = 0; i < 6; i++) {
                    if (a.transactionDate[i] !== b.transactionDate[i]) {
                        return b.transactionDate[i] - a.transactionDate[i];
                    }
                }
                return 0;
            }
            return 0;
        });

        // Helper function to check if piece is consumable
        function isConsumable(transaction) {
            const pieceId = transaction.piece?.id;
            if (pieceId && pieceInfoMap.has(pieceId)) {
                const piece = pieceInfoMap.get(pieceId);
                return piece?.pieceType === 'CONSUMABLE';
            }
            if (transaction.piece?.pieceType) {
                return transaction.piece.pieceType === 'CONSUMABLE';
            }
            return false;
        }

        let pendingItems = [];
        let returnedItems = [];

        transactions.forEach(transaction => {
            if (transaction.transactionType === 'CHECKOUT') {
                if (transaction.status === 'PENDING' || transaction.status === 'OVERDUE') {
                    if (!isConsumable(transaction)) {
                        pendingItems.push(transaction);
                    } else {
                        returnedItems.push(transaction);
                    }
                } else if (transaction.status === 'COMPLETED') {
                    returnedItems.push(transaction);
                }
            }
        });

        if (pendingBadge) pendingBadge.textContent = pendingItems.length;
        if (returnedBadge) returnedBadge.textContent = returnedItems.length;

        if (pendingItems.length === 0) {
            if (noPendingItems) noPendingItems.classList.remove('hidden');
        } else {
            if (noPendingItems) noPendingItems.classList.add('hidden');
        }

        if (returnedItems.length === 0) {
            if (noReturnedItems) noReturnedItems.classList.remove('hidden');
        } else {
            if (noReturnedItems) noReturnedItems.classList.add('hidden');
        }

        // Populate pending items
        if (pendingItemsGrid) {
            pendingItems.forEach(transaction => {
                const card = createItemCard(transaction, pieceInfoMap);
                pendingItemsGrid.appendChild(card);
            });
        }

        // Populate returned items
        if (returnedItemsGrid) {
            returnedItems.forEach(transaction => {
                const card = createItemCard(transaction, pieceInfoMap, true);
                returnedItemsGrid.appendChild(card);
            });
        }

        // Activate appropriate tab
        // Activate appropriate tab
        if (pendingItems.length > 0) {
            activateTab('pending');
        } else if (returnedItems.length > 0) {
            activateTab('returned');
        }

        // Resolve partner names after cards are created
        setTimeout(() => {
            resolvePartnerNames();
        }, 100);
    }

    function createItemCard(transaction, pieceInfoMap, isReturnedSection = false) {
        const card = document.createElement('div');
        card.className = 'item-card';

        if (transaction.status === 'OVERDUE') {
            card.classList.add('overdue');
        }

        let pieceName = 'Unknown Item';
        let pieceType = '';
        const pieceId = transaction.piece?.id;

        if (pieceId) {
            if (transaction.piece.name) {
                pieceName = transaction.piece.name;
                pieceType = transaction.piece.pieceType;
            } else if (pieceInfoMap.has(pieceId)) {
                const piece = pieceInfoMap.get(pieceId);
                pieceName = piece?.name || `Item #${pieceId}`;
                pieceType = piece?.pieceType || '';
            } else {
                pieceName = `Item #${pieceId}`;
            }
        }

        const checkoutDate = formatDateTime(transaction.transactionDate);
        const expectedReturn = formatDateTime(transaction.expectedReturnDate);
        const actualReturn = transaction.status === 'COMPLETED' ?
            formatDateTime(transaction.actualReturnDate) : 'Not returned yet';

        let statusText = formatStatus(transaction.status);
        let statusClass = getStatusClass(transaction.status);

        if (isReturnedSection && pieceType === 'CONSUMABLE' && transaction.status === 'PENDING') {
            statusText = 'Consumed';
            statusClass = 'status-consumed';
        }

        const quantity = transaction.quantity ? Math.abs(transaction.quantity) : 1;

        let partnersHtml = '';

        // Helper function to fetch student names from codes
        // Helper function to fetch student names from codes
        async function getStudentNamesByCode(studentCodes) {
            const names = [];
            for (const code of studentCodes) {
                try {
                    const student = await apiService.getStudentByCode(code.trim());
                    if (student && student.fullName) {
                        names.push(student.fullName);
                    } else {
                        names.push(`Unknown (${code.trim()})`); // Show code only if name not found
                    }
                } catch (error) {
                    console.warn(`Could not fetch name for student code: ${code}`);
                    names.push(`Unknown (${code.trim()})`); // Show code only on error
                }
            }
            return names;
        }

        // Process partner information
        let partnerCodes = [];

        // First priority: Check if notes contain the enhanced format with names and codes
        if (transaction.notes && transaction.notes.includes('Additional students:')) {
            try {
                const notesLines = transaction.notes.split('\n');
                const additionalStudentsLine = notesLines.find(line => line.includes('Additional students:'));
                if (additionalStudentsLine) {
                    const studentsInfo = additionalStudentsLine.split('Additional students:')[1].trim();

                    // Check if the format already contains names (not just codes)
                    if (studentsInfo.includes('(') && studentsInfo.includes(')')) {
                        // Format: "Name1 (CODE1), Name2 (CODE2)" - extract names only
                        const partnerNames = studentsInfo.split(',').map(entry => {
                            return entry.replace(/\([^)]*\)/g, '').trim();
                        }).filter(name => name.length > 0);

                        if (partnerNames.length > 0) {
                            partnersHtml = `
                        <div class="item-detail">
                            <span class="detail-label">Partners:</span>
                            <span class="detail-value">${partnerNames.join(', ')}</span>
                        </div>
                    `;
                        }
                    } else {
                        // Format might be just codes - collect for name resolution
                        partnerCodes = studentsInfo.split(',').map(entry => entry.trim()).filter(code => code.length > 0);
                    }
                }
            } catch (e) {
                console.log('Could not parse partner names from notes');
            }
        }

        // Second priority: If no partners found in notes, check additionalStudents field
        if (!partnersHtml && !partnerCodes.length && transaction.additionalStudents) {
            try {
                const additionalStudents = JSON.parse(transaction.additionalStudents);
                if (additionalStudents && additionalStudents.length > 0) {
                    partnerCodes = additionalStudents;
                }
            } catch (e) {
                if (transaction.additionalStudents && transaction.additionalStudents.trim()) {
                    // Raw string - might be codes separated by comma
                    partnerCodes = transaction.additionalStudents.split(',').map(code => code.trim()).filter(code => code.length > 0);
                }
            }
        }

        // If we have codes but no names yet, resolve names asynchronously
        if (!partnersHtml && partnerCodes.length > 0) {
            partnersHtml = `
        <div class="item-detail">
            <span class="detail-label">Partners:</span>
            <span class="detail-value partner-names-placeholder" data-codes="${partnerCodes.join(',')}">Loading...</span>
        </div>
    `;
        }

        let displayNotes = transaction.notes;
        if (displayNotes && displayNotes.includes('Additional students:')) {
            const notesLines = displayNotes.split('\n');
            displayNotes = notesLines.filter(line => !line.includes('Additional students:')).join('\n').trim();
        }

        card.innerHTML = `
            <div class="item-status ${statusClass}">${statusText}</div>
            <h4 class="item-name">${pieceName}</h4>
            ${pieceType === 'CONSUMABLE' ? '<div class="item-type-badge consumable">Consumable</div>' : ''}
            <div class="item-details">
                <div class="item-detail">
                    <span class="detail-label">Quantity:</span>
                    <span class="detail-value">${quantity}</span>
                </div>
                <div class="item-detail">
                    <span class="detail-label">Checkout By:</span>
                    <span class="detail-value">${transaction.authorizedBy || 'Unknown'}</span>
                </div>
                ${partnersHtml}
                ${displayNotes && displayNotes.trim() ? `
                <div class="item-detail">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${displayNotes}</span>
                </div>
                ` : ''}
            </div>
            <div class="item-dates">
                <div>Checked out: ${checkoutDate}</div>
                ${pieceType !== 'CONSUMABLE' ? `<div>Expected return: ${expectedReturn}</div>` : ''}
                ${transaction.status === 'COMPLETED' ? `<div>Actual return: ${actualReturn}</div>` : ''}
                ${pieceType === 'CONSUMABLE' && transaction.status === 'PENDING' ? '<div>No return required (consumable)</div>' : ''}
            </div>
        `;

        return card;
    }

    function updateStatistics(transactions) {
        if (totalCount) totalCount.textContent = transactions ? transactions.length : 0;

        let checkouts = 0;
        let returns = 0;
        let pending = 0;

        if (transactions && transactions.length > 0) {
            transactions.forEach(t => {
                if (t.transactionType === 'CHECKOUT') {
                    checkouts++;
                    if (t.status === 'PENDING' || t.status === 'OVERDUE') {
                        pending++;
                    }
                } else if (t.transactionType === 'RETURN') {
                    returns++;
                }
            });
        }

        if (checkoutCount) checkoutCount.textContent = checkouts;
        if (returnCount) returnCount.textContent = returns;
        if (pendingCount) pendingCount.textContent = pending;
    }


    // Function to resolve partner names after card creation
    async function resolvePartnerNames() {
        const placeholders = document.querySelectorAll('.partner-names-placeholder');

        for (const placeholder of placeholders) {
            const codes = placeholder.getAttribute('data-codes');
            if (codes) {
                const studentCodes = codes.split(',').map(code => code.trim());
                try {
                    const partnerNames = [];
                    for (const code of studentCodes) {
                        try {
                            const student = await apiService.getStudentByCode(code);
                            if (student && student.fullName) {
                                partnerNames.push(student.fullName);
                            } else {
                                partnerNames.push(`Unknown (${code})`);
                            }
                        } catch (error) {
                            console.warn(`Could not fetch name for student code: ${code}`);
                            partnerNames.push(`Unknown (${code})`);
                        }
                    }

                    placeholder.textContent = partnerNames.join(', ');
                    placeholder.classList.remove('partner-names-placeholder');
                } catch (error) {
                    console.error('Error resolving partner names:', error);
                    placeholder.textContent = studentCodes.join(', '); // Fallback to codes
                    placeholder.classList.remove('partner-names-placeholder');
                }
            }
        }
    }

    function formatDateTime(dateValue) {
        if (!dateValue) return 'N/A';

        try {
            if (Array.isArray(dateValue)) {
                const [year, month, day, hour, minute, second] = dateValue;
                const jsMonth = month - 1;
                const date = new Date(year, jsMonth, day, hour, minute, second);

                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (typeof dateValue === 'string') {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }

            return String(dateValue);
        } catch (error) {
            console.error('Error formatting date:', error, dateValue);
            return 'Date error';
        }
    }

    function formatStatus(status) {
        switch (status) {
            case 'PENDING': return 'Pending';
            case 'COMPLETED': return 'Completed';
            case 'OVERDUE': return 'Overdue';
            case 'PARTIAL': return 'Partial';
            case 'CANCELLED': return 'Cancelled';
            default: return status;
        }
    }

    function getStatusClass(status) {
        switch (status) {
            case 'PENDING': return 'status-pending';
            case 'COMPLETED': return 'status-completed';
            case 'OVERDUE': return 'status-overdue';
            default: return '';
        }
    }

    function showErrorMessage(message) {
        if (errorMessage) errorMessage.textContent = message;
    }

    function clearErrorMessage() {
        if (errorMessage) errorMessage.textContent = '';
    }

    function showLoading() {
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    }

    function hideLoading() {
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
    }

    function hideStudentInfo() {
        if (studentInfo) {
            studentInfo.classList.add('hidden');
            studentInfo.classList.remove('show');
        }
        if (noPendingItems) noPendingItems.classList.remove('hidden');
        if (noReturnedItems) noReturnedItems.classList.remove('hidden');
        if (pendingItemsGrid) pendingItemsGrid.innerHTML = '';
        if (returnedItemsGrid) returnedItemsGrid.innerHTML = '';
    }

    function checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const studentCode = urlParams.get('studentCode');

        if (studentCode && studentSearchInput) {
            studentSearchInput.value = studentCode;
            searchStudent();
        }
    }

    checkUrlParameters();
});