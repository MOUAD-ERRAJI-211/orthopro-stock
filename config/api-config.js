const API_CONFIG = {
    BASE_URL: 'https://web-production-47eca.up.railway.app',
    ENDPOINTS: {
        AUTH: '/api/students/validate-qr',
        STUDENTS: '/api/students', STUDENT_BY_CODE: '/api/students/code',
        STUDENT_BY_QR: '/api/students/qr', STUDENT_CLASS: '/api/students/class',
        STUDENT_ACTIVE_CHECKOUTS: '/api/students', STUDENT_HISTORY: '/api/students/student',
        STUDENT_STATISTICS: '/api/students/statistics', STUDENT_CLASS_GROUPS: '/api/students/class-groups',
        STUDENT_ACADEMIC_YEARS: '/api/students/academic-years', STUDENT_QR_IMAGE: '/api/students/qr-image',
        STUDENT_REGENERATE_QR: '/api/students/regenerate-qr',
        PIECES: '/api/pieces', PIECE_BY_REFERENCE: '/api/pieces/reference',
        PIECE_BY_CATEGORY: '/api/pieces/category', PIECE_LOW_STOCK: '/api/pieces/low-stock',
        PIECE_OUT_OF_STOCK: '/api/pieces/out-of-stock', PIECE_BY_TYPE: '/api/pieces/type',
        PIECE_SEARCH: '/api/pieces/search', PIECE_CATEGORIES: '/api/pieces/categories',
        PIECE_LOCATIONS: '/api/pieces/locations', PIECE_SUPPLIERS: '/api/pieces/suppliers',
        PIECE_UNIT_TYPES: '/api/pieces/unit-types', PIECE_STATISTICS: '/api/pieces/statistics',
        PIECE_IMAGE_UPLOAD: '/api/pieces/{id}/image', PIECE_BY_MONTH: '/api/pieces/by-month',
        PIECE_ADJUSTMENT_HISTORY: '/api/pieces/adjustment-history',
        TRANSACTIONS: '/api/transactions', TRANSACTION_CHECKOUT: '/api/transactions/checkout',
        TRANSACTION_RETURN: '/api/transactions/return', TRANSACTION_PARTIAL_RETURN: '/api/transactions/partial-return',
        TRANSACTION_ADJUSTMENT: '/api/transactions/adjustment', TRANSACTION_STATISTICS: '/api/transactions/statistics',
        TRANSACTION_DAILY_SUMMARY: '/api/transactions/daily-summary', TRANSACTION_UPDATE_OVERDUE: '/api/transactions/update-overdue',
        TRANSACTION_SEARCH: '/api/transactions/search', PIECE_BY_QR_CODE: '/api/pieces/qr-code',
        PIECE_UPDATE_QR: '/api/pieces/{id}/qr-code'
    },
    DEFAULT_HEADERS: { 'Content-Type': 'application/json' }
};

