// ============================================================================
// Rate Limiting Middleware
// Protects against brute-force attacks and API abuse
// ============================================================================

const rateLimit = require('express-rate-limit');

// General API rate limiter — Elevated for continuous development
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many requests from this IP. Please try again after 15 minutes.'
    }
});

// Strict limiter for auth endpoints — 10 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts. Account temporarily locked for 15 minutes.'
    }
});

// Transfer limiter — 30 transfers per 15 minutes
const transferLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Transfer rate limit exceeded. Please try again later.'
    }
});

module.exports = { apiLimiter, authLimiter, transferLimiter };
