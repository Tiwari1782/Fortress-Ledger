const express = require('express');
const router = express.Router();
const bankingController = require('../controllers/bankingController');
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/authMiddleware');
const { transferLimiter } = require('../middleware/rateLimiter');
const { transferRules } = require('../middleware/validate');

// All banking routes require the user to be logged in (verifyToken)
router.use(verifyToken);

router.get('/balance', bankingController.getBalance);
router.get('/history', profileController.getHistoryPaginated);
router.post('/transfer', transferLimiter, transferRules, bankingController.transfer);
router.get('/statement/:year/:month', bankingController.getStatement);

// Profile & Transaction Detail routes
router.get('/profile', profileController.getProfile);
router.get('/transaction/:id', profileController.getTransactionDetails);

// Phase 2 Routes
router.get('/analytics', bankingController.getExpenseAnalytics);
router.post('/scheduled', bankingController.createScheduledTransfer);
router.get('/scheduled', bankingController.getScheduledTransfers);

module.exports = router;