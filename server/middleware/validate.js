// ============================================================================
// Input Validation Middleware (express-validator)
// Ensures all user inputs meet security and format requirements
// ============================================================================

const { body, validationResult } = require('express-validator');

// Middleware to check validation results
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

// Registration validation rules
const registerRules = [
    body('email')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email must be 255 characters or less'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
    handleValidation
];

// Login validation rules
const loginRules = [
    body('email')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    handleValidation
];

// Transfer validation rules
const transferRules = [
    body('receiver_account_no')
        .notEmpty().withMessage('Receiver account number is required')
        .isLength({ min: 12, max: 12 }).withMessage('Invalid account number format'),
    body('amount')
        .isFloat({ min: 0.01, max: 1000000 }).withMessage('Amount must be between $0.01 and $1,000,000'),
    handleValidation
];

// Capital supply validation
const supplyRules = [
    body('account_no')
        .notEmpty().withMessage('Account number is required'),
    body('amount')
        .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    handleValidation
];

module.exports = { registerRules, loginRules, transferRules, supplyRules };
