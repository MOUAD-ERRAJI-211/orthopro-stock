/**
 * Complete API Service for OrthoProConnect
 * Handles all interactions with the backend API
 */
class ApiService {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.headers = API_CONFIG.DEFAULT_HEADERS;
    }

    getInventoryByMonth = async function (month, year) {
        try {
            const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}/by-month?month=${month}&year=${year}`;
            return await this.fetchWithError(url);
        } catch (error) {
            console.error('Error fetching inventory by month:', error);

            // Check if it's the PostgreSQL function error
            if (error.message && (
                error.message.includes("month(timestamp without time zone) n'existe pas") ||
                error.message.includes("function month(timestamp without time zone) does not exist")
            )) {
                console.log("Using client-side fallback for month filtering");

                // Fallback: Get all pieces and filter client-side
                const allPieces = await this.getAllPieces();

                // Parse month and year as integers
                const monthNum = parseInt(month);
                const yearNum = parseInt(year);

                // Filter pieces that were updated in the selected month/year
                return allPieces.filter(piece => {
                    // Helper function to check if a date matches the month/year
                    const dateMatches = (dateStr) => {
                        if (!dateStr) return false;

                        // Handle different date formats
                        let date;
                        if (Array.isArray(dateStr)) {
                            // Handle array format [year, month, day, ...]
                            return dateStr[0] === yearNum && dateStr[1] === monthNum;
                        } else {
                            // Handle string format
                            date = new Date(dateStr);
                            return date.getMonth() + 1 === monthNum && date.getFullYear() === yearNum;
                        }
                    };

                    // Check relevant date fields
                    return dateMatches(piece.lastCheckout) ||
                        dateMatches(piece.lastReturn) ||
                        dateMatches(piece.updatedAt) ||
                        dateMatches(piece.createdAt);
                });
            }

            // If it's a different error, rethrow it
            throw error;
        }
    }



    getAdjustmentHistory = async function () {
        try {
            const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}/adjustment-history`;
            return await this.fetchWithError(url);
        } catch (error) {
            console.error('Error fetching adjustment history:', error);
            throw error;
        }
    };




    // Helper method for API calls with improved error handling
    async fetchWithError(url, options = {}) {
        try {
            console.log(`Fetching: ${url}`);
            const response = await fetch(url, {
                ...options,
                headers: this.headers,
                // Include credentials for cookies
                credentials: 'include',
                // Set mode to cors
                mode: 'cors'
            });

            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || `HTTP error! Status: ${response.status}`;
                } catch (e) {
                    errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);

            // Add specific error information for CORS issues
            if (error.message.includes('NetworkError') ||
                error.message.includes('Failed to fetch') ||
                error.message.includes('CORS')) {

                console.error('This appears to be a CORS issue. Please check:');
                console.error('1. The server is running at', this.baseUrl);
                console.error('2. CORS is properly configured on the server');
                console.error('3. Your origin (current URL) is allowed in server CORS settings');
            }

            throw error;
        }


    }



    async uploadPieceImage(pieceId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/pieces/${pieceId}/image`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - browser will set it automatically with boundary
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // Update piece (for thresholds and other updates)
    async updatePiece(pieceId, updateData) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/pieces/${pieceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Update failed' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // Update piece QR code
    async updatePieceQrCode(pieceId, qrCode) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/pieces/${pieceId}/qr-code`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ qrCode: qrCode })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'QR code update failed' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // Adjust piece stock
    async adjustPieceStock(pieceId, adjustmentData) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/pieces/${pieceId}/stock`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(adjustmentData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Stock adjustment failed' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // Get inventory by month
    async getInventoryByMonth(month, year) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/pieces/by-month?month=${month}&year=${year}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }
    
    // Get adjustment history
    async getAdjustmentHistory() {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/pieces/adjustment-history`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }



    


    // Add these methods to the ApiService class in api.js

    /**
     * Get a piece by QR code
     * @param {string} qrCode QR code to search for
     * @returns {Promise<Object>} Piece data
     */
    async getPieceByQrCode(qrCode) {
        try {
            console.log(`Searching for QR code: ${qrCode}`);

            if (!qrCode || qrCode.trim() === '') {
                throw new Error('QR code cannot be empty');
            }

            const cleanQrCode = qrCode.trim();
            const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_BY_QR_CODE}/${encodeURIComponent(cleanQrCode)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers,
                credentials: 'include',
                mode: 'cors'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                } else {
                    let errorMessage;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || `HTTP error! Status: ${response.status}`;
                    } catch (e) {
                        errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }
            }

            const piece = await response.json();
            return piece;

        } catch (error) {
            console.error('Error in getPieceByQrCode:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Network error - please check your connection and server status');
            }
            throw error;
        }
    }



    



    /**
     * Get adjustment history
     * @returns {Promise<Array>} List of stock adjustments
     */
    async getAdjustmentHistory() {
        try {
            const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}/adjustment-history`;
            return await this.fetchWithError(url);
        } catch (error) {
            console.error('Error fetching adjustment history:', error);
            throw error;
        }
    }

    

    //=====================================================
    // AUTHENTICATION METHODS
    //=====================================================

    /**
     * Authenticate a student using QR code data
     * @param {string} qrData QR code data to validate
     * @returns {Promise<Object>} Student data
     */
    async validateStudent(qrData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH}?qrData=${encodeURIComponent(qrData)}`;
        const student = await this.fetchWithError(url);
        // Store in sessionStorage (temporary, cleared on page refresh)
        sessionStorage.setItem('currentStudent', JSON.stringify(student));
        return student;
    }

    /**
     * Authenticate a student using student code
     * @param {string} studentCode Student code to validate
     * @returns {Promise<Object>} Student data
     */
    async validateStudentByCode(studentCode) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_BY_CODE}/${encodeURIComponent(studentCode)}`;
        const student = await this.fetchWithError(url);
        // Store in sessionStorage (temporary, cleared on page refresh)
        sessionStorage.setItem('currentStudent', JSON.stringify(student));
        return student;
    }

    /**
     * Check if a user is currently authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        return !!sessionStorage.getItem('currentStudent');
    }

    /**
     * Get the current authenticated student
     * @returns {Object|null} Student data or null if not authenticated
     */
    getCurrentStudent() {
        const studentData = sessionStorage.getItem('currentStudent');
        if (!studentData) {
            return null;
        }
        return JSON.parse(studentData);
    }

    /**
     * Log out the current user
     */
    logout() {
        sessionStorage.removeItem('currentStudent');
    }

    /**
    // Replace the testConnection method in api.js with this improved version:

/**
 * Test the API connection (helpful for diagnosing CORS issues)
 * @returns {Promise<boolean>} True if connection successful
 */
    async testConnection() {
        try {
            // Use the proper endpoint
            const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}`;
            console.log(`Testing API connection to: ${url}`);

            // First try a regular GET request instead of OPTIONS
            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers,
                mode: 'cors',
                credentials: 'include'
            });

            console.log('API connection test response:', response);
            return response.ok;
        } catch (error) {
            console.error('API connection test failed:', error);

            // Add more diagnostic information
            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                console.error('Network error - make sure your backend server is running at', this.baseUrl);
            } else if (error.message.includes('CORS')) {
                console.error('CORS error - make sure CORS is properly configured on the server');
            }

            return false;
        }
    }

    //=====================================================
    // STUDENT METHODS
    //=====================================================

    /**
     * Get all students
     * @returns {Promise<Array>} List of all students
     */
    async getAllStudents() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get active students
     * @returns {Promise<Array>} List of active students
     */
    async getActiveStudents() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/active`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a student by ID
     * @param {number} id Student ID
     * @returns {Promise<Object>} Student data
     */
    async getStudentById(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/${id}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a student by student code
     * @param {string} studentCode Student code
     * @returns {Promise<Object>} Student data
     */
    async getStudentByCode(studentCode) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_BY_CODE}/${encodeURIComponent(studentCode)}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a student by QR code
     * @param {string} qrCode QR code
     * @returns {Promise<Object>} Student data
     */
    async getStudentByQrCode(qrCode) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_BY_QR}/${encodeURIComponent(qrCode)}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get students by class group
     * @param {string} classGroup Class group
     * @returns {Promise<Array>} List of students in the class
     */
    async getStudentsByClass(classGroup) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_CLASS}/${encodeURIComponent(classGroup)}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get students with pending returns
     * @returns {Promise<Array>} List of students with pending returns
     */
    async getStudentsWithPendingReturns() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/pending-returns`;
        return await this.fetchWithError(url);
    }

    /**
     * Get students with overdue items
     * @returns {Promise<Array>} List of students with overdue items
     */
    async getStudentsWithOverdueItems() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/overdue`;
        return await this.fetchWithError(url);
    }

    /**
     * Search for students
     * @param {string} searchTerm Search term
     * @param {Object} filters Additional filters
     * @returns {Promise<Array>} List of matching students
     */
    async searchStudents(searchTerm, filters = {}) {
        let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/search?`;

        if (searchTerm) {
            url += `searchTerm=${encodeURIComponent(searchTerm)}&`;
        }

        // Add filters
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                url += `${key}=${encodeURIComponent(filters[key])}&`;
            }
        });

        return await this.fetchWithError(url);
    }

    /**
     * Get a student's transaction history
     * @param {string} studentCode Student code
     * @param {number} days Number of days to include
     * @returns {Promise<Object>} Student history data
     */
    async getStudentHistory(studentCode, days = 30) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_HISTORY}/${studentCode}/history?days=${days}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a student's active checkouts
     * @param {number} studentId Student ID
     * @returns {Promise<Array>} List of active checkouts
     */
    async getStudentActiveCheckouts(studentId) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_ACTIVE_CHECKOUTS}/${studentId}/active-checkouts`;
        return await this.fetchWithError(url);
    }

    /**
     * Create a new student
     * @param {Object} studentData Student data
     * @returns {Promise<Object>} Created student
     */
    async createStudent(studentData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(studentData)
        });
    }

    /**
     * Update a student
     * @param {number} id Student ID
     * @param {Object} updateData Updated student data
     * @returns {Promise<Object>} Updated student
     */
    async updateStudent(id, updateData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/${id}`;
        return await this.fetchWithError(url, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }

    /**
     * Delete a student
     * @param {number} id Student ID
     * @returns {Promise<Object>} Response
     */
    async deleteStudent(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENTS}/${id}`;
        return await this.fetchWithError(url, {
            method: 'DELETE'
        });
    }

    /**
     * Regenerate a student's QR code
     * @param {number} id Student ID
     * @returns {Promise<Object>} Response with new QR code
     */
    async regenerateStudentQr(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_REGENERATE_QR}/${id}`;
        return await this.fetchWithError(url, {
            method: 'POST'
        });
    }

    /**
     * Get student statistics
     * @returns {Promise<Object>} Student statistics
     */
    async getStudentStatistics() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_STATISTICS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get all class groups
     * @returns {Promise<Array>} List of class groups
     */
    async getClassGroups() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_CLASS_GROUPS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get all academic years
     * @returns {Promise<Array>} List of academic years
     */
    async getAcademicYears() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STUDENT_ACADEMIC_YEARS}`;
        return await this.fetchWithError(url);
    }

    //=====================================================
    // PIECE/INVENTORY METHODS
    //=====================================================

    /**
     * Get all pieces/inventory items
     * @returns {Promise<Array>} List of all pieces
     */
    async getAllPieces() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a piece by ID
     * @param {number} id Piece ID
     * @returns {Promise<Object>} Piece data
     */
    async getPieceById(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}/${id}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a piece by reference
     * @param {string} reference Piece reference
     * @returns {Promise<Object>} Piece data
     */
    async getPieceByReference(reference) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_BY_REFERENCE}/${encodeURIComponent(reference)}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get pieces by category
     * @param {string} category Category
     * @returns {Promise<Array>} List of pieces in the category
     */
    async getPiecesByCategory(category) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_BY_CATEGORY}/${encodeURIComponent(category)}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get low stock pieces
     * @returns {Promise<Array>} List of low stock pieces
     */
    async getLowStockPieces() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_LOW_STOCK}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get out of stock pieces
     * @returns {Promise<Array>} List of out of stock pieces
     */
    async getOutOfStockPieces() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_OUT_OF_STOCK}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get pieces by type
     * @param {string} type Piece type
     * @returns {Promise<Array>} List of pieces of the type
     */
    async getPiecesByType(type) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_BY_TYPE}/${encodeURIComponent(type)}`;
        return await this.fetchWithError(url);
    }

    /**
     * Search for pieces
     * @param {string} searchTerm Search term
     * @param {Object} filters Additional filters
     * @returns {Promise<Array>} List of matching pieces
     */
    async searchPieces(searchTerm, filters = {}) {
        let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_SEARCH}?`;

        if (searchTerm) {
            url += `searchTerm=${encodeURIComponent(searchTerm)}&`;
        }

        // Add filters
        Object.keys(filters).forEach(key => {
            if (filters[key]) {
                url += `${key}=${encodeURIComponent(filters[key])}&`;
            }
        });

        return await this.fetchWithError(url);
    }

    /**
     * Get transactions for a piece
     * @param {number} pieceId Piece ID
     * @param {string} startDate Start date (optional)
     * @param {string} endDate End date (optional)
     * @returns {Promise<Array>} List of transactions
     */
    async getPieceTransactions(pieceId, startDate, endDate) {
        let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}/${pieceId}/transactions`;

        if (startDate && endDate) {
            url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        }

        return await this.fetchWithError(url);
    }


    /**
     * Create a new piece
     * @param {Object} pieceData Piece data
     * @returns {Promise<Object>} Created piece
     */
    async createPiece(pieceData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(pieceData)
        });
    }

   
    
    /**
     * Delete a piece
     * @param {number} id Piece ID
     * @returns {Promise<Object>} Response
     */
    async deletePiece(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECES}/${id}`;
        return await this.fetchWithError(url, {
            method: 'DELETE'
        });
    }

    /**
     * Get inventory statistics
     * @returns {Promise<Object>} Inventory statistics
     */
    async getInventoryStatistics() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_STATISTICS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get all categories
     * @returns {Promise<Array>} List of categories
     */
    async getCategories() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_CATEGORIES}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get all locations
     * @returns {Promise<Array>} List of locations
     */
    async getLocations() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_LOCATIONS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get all suppliers
     * @returns {Promise<Array>} List of suppliers
     */
    async getSuppliers() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_SUPPLIERS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get all unit types
     * @returns {Promise<Array>} List of unit types
     */
    async getUnitTypes() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.PIECE_UNIT_TYPES}`;
        return await this.fetchWithError(url);
    }

    //=====================================================
    // TRANSACTION METHODS
    //=====================================================

    /**
     * Get all transactions
     * @returns {Promise<Array>} List of all transactions
     */
    async getAllTransactions() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTIONS}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get a transaction by ID
     * @param {number} id Transaction ID
     * @returns {Promise<Object>} Transaction data
     */
    async getTransactionById(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`;
        return await this.fetchWithError(url);
    }

    /**
     * Create a checkout
     * @param {Object} checkoutData Checkout data
     * @returns {Promise<Object>} Checkout result
     */
    async createCheckout(checkoutData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_CHECKOUT}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(checkoutData)
        });
    }

    /**
     * Return items
     * @param {Object} returnData Return data
     * @returns {Promise<Object>} Return result
     */
    async returnItems(returnData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_RETURN}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(returnData)
        });
    }

    /**
     * Partial return of items
     * @param {Object} partialReturnData Partial return data
     * @returns {Promise<Object>} Partial return result
     */
    async partialReturn(partialReturnData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_PARTIAL_RETURN}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(partialReturnData)
        });
    }

    /**
     * Create a stock adjustment
     * @param {Object} adjustmentData Adjustment data
     * @returns {Promise<Object>} Adjustment result
     */
    async createAdjustment(adjustmentData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_ADJUSTMENT}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(adjustmentData)
        });
    }

    /**
     * Delete a transaction
     * @param {number} id Transaction ID
     * @returns {Promise<Object>} Response
     */
    async deleteTransaction(id) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTIONS}/${id}`;
        return await this.fetchWithError(url, {
            method: 'DELETE'
        });
    }

    /**
     * Search for transactions
     * @param {Object} searchData Search criteria
     * @returns {Promise<Array>} Matching transactions
     */
    async searchTransactions(searchData) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_SEARCH}`;
        return await this.fetchWithError(url, {
            method: 'POST',
            body: JSON.stringify(searchData)
        });
    }

    /**
     * Get transaction statistics
     * @param {number} days Number of days to include
     * @returns {Promise<Object>} Transaction statistics
     */
    async getTransactionStatistics(days = 30) {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_STATISTICS}?days=${days}`;
        return await this.fetchWithError(url);
    }

    /**
     * Get daily transaction summary
     * @param {string} date Date (optional)
     * @returns {Promise<Object>} Daily transaction summary
     */
    async getDailyTransactionSummary(date) {
        let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_DAILY_SUMMARY}`;
        if (date) {
            url += `?date=${encodeURIComponent(date)}`;
        }
        return await this.fetchWithError(url);
    }

    /**
     * Update overdue transactions
     * @returns {Promise<Object>} Update result
     */
    async updateOverdueTransactions() {
        const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRANSACTION_UPDATE_OVERDUE}`;
        return await this.fetchWithError(url);
    }

    //=====================================================
    // UTILITY METHODS
    //=====================================================

    /**
     * Format a date string for display
     * @param {string} dateString Date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format a date string for display with time
     * @param {string} dateString Date string
     * @returns {string} Formatted date with time
     */
    formatDateTime(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format a date for input fields (YYYY-MM-DD)
     * @param {Date} date Date object
     * @returns {string} Formatted date for input
     */
    formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Add these methods to the end of your ApiService class in api.js
    // Insert them just before the closing brace of the class - at line 587 in your file
    // After formatDateForInput method and before the closing brace of the ApiService class

    
}


// Create a global instance
const apiService = new ApiService();

// Test the connection when the script loads
setTimeout(() => {
    console.log('Testing API connection...');
    apiService.testConnection().then(result => {
        console.log('API connection test result:', result ? 'Success' : 'Failed');
    });
}, 1000);