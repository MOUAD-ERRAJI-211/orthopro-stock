const APP_CONFIG = {
    QR_CODE_SCANNER_ID: 'qr-scanner',
    AUTH_TIMEOUT: 3600, // 1 hour in seconds
    LOW_STOCK_THRESHOLD: 5,
    CRITICAL_STOCK_THRESHOLD: 2,
    UNITS: ['mm', 'cm', 'cl', 'litre', 'piece', 'pair', 'unit'],
    PIECE_TYPES: {
        CONSUMABLE: 'Consumable',
        NON_CONSUMABLE: 'Non-consumable',
        TOOL: 'Tool',
        SPARE_PART: 'Spare part'
    },
    TRANSACTION_TYPES: {
        CHECKOUT: 'CHECKOUT',
        RETURN: 'RETURN',
        ADJUSTMENT: 'ADJUSTMENT',
        CONSUMPTION: 'CONSUMPTION',
        DAMAGED: 'DAMAGED',
        LOST: 'LOST'
    }
};
