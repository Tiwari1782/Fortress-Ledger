const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

// ============================================================================
// Environment Variable Validation
// ============================================================================
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`\n❌ FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('   Please copy .env.example to .env and fill in your values.\n');
    process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is too short. Use at least 32 characters for production security.');
}

// ============================================================================
// Route & Middleware Imports
// ============================================================================
const authRoutes = require('./routes/authRoutes');
const bankingRoutes = require('./routes/bankingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const pool = require('./config/db');

const app = express();

// ============================================================================
// Core Middleware
// ============================================================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent abuse
app.use(cookieParser());

// Request logging (dev mode only)
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// CORS Configuration
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

// Global rate limiter
app.use('/api', apiLimiter);

// ============================================================================
// Routes
// ============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.execute('SELECT 1');
        res.json({
            status: 'UP',
            service: 'FortressLedger API',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()) + 's'
        });
    } catch (err) {
        res.status(503).json({
            status: 'DOWN',
            service: 'FortressLedger API',
            error: 'Database connection failed'
        });
    }
});

// ============================================================================
// Global Error Handler (must be last middleware)
// ============================================================================
app.use(errorHandler);

// ============================================================================
// Server Startup & Graceful Shutdown
// ============================================================================
const PORT = process.env.PORT || 5000;

// Create HTTP server handling Express and Socket.IO
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        credentials: true
    }
});

// Make io accessible to our routers/controllers
app.set('io', io);

io.on("connection", (socket) => {
    // A client connects. They can listen to global events by default.
    
    // Join a specific room based on account ID for private transfer notifications
    socket.on("join_account", (account_no) => {
        socket.join(account_no);
    });

    socket.on("disconnect", () => {
        // Disconnected
    });
});

const server = httpServer.listen(PORT, () => {
    console.log(`\n🏦 FortressLedger Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   WebSockets: ACTIVE\n`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.log(`\n⚡ Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async () => {
        console.log('   ✓ HTTP server closed');
        try {
            await pool.end();
            console.log('   ✓ Database pool drained');
        } catch (err) {
            console.error('   ✗ Error closing database pool:', err.message);
        }
        console.log('   ✓ Shutdown complete.\n');
        process.exit(0);
    });

    // Force shutdown after 10s if graceful shutdown fails
    setTimeout(() => {
        console.error('   ✗ Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));