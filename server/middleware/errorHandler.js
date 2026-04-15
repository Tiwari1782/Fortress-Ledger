// ============================================================================
// Global Error Handler Middleware
// Catches all unhandled errors and returns a consistent JSON response
// ============================================================================

const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

    // MySQL duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'A record with this information already exists.'
        });
    }

    // MySQL connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(503).json({
            error: 'Database service is currently unavailable.'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Authentication token has expired.' });
    }

    // Validation errors from express-validator
    if (err.type === 'validation') {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.errors
        });
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'An internal server error occurred.'
            : err.message || 'Internal Server Error'
    });
};

module.exports = errorHandler;
