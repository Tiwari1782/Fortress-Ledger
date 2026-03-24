const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Protect all admin routes: User must be logged in AND have the 'ADMIN' role
router.use(verifyToken, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/fraud-alerts', adminController.getFraudAlerts);
router.patch('/freeze/:id', adminController.freezeAccount);
router.get('/audit-trail', adminController.getAuditTrail);

module.exports = router;