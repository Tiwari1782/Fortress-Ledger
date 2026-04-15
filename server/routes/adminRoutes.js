const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { supplyRules } = require('../middleware/validate');

// Protect all admin routes
router.use(verifyToken, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/fraud-alerts', adminController.getFraudAlerts);
router.patch('/freeze/:id', adminController.freezeAccount);
router.get('/audit-trail', adminController.getAuditTrail);
router.get('/chart', adminController.getChartData);
router.get('/ticker', adminController.getTicker);
router.post('/supply', supplyRules, adminController.supplyCapital);
router.get('/account/:account_no', adminController.getAccountDetails);

// DEFCON Routes
router.get('/system-status', adminController.getSystemStatus);
router.post('/system-lockdown', adminController.toggleSystemLockdown);

// Advanced DBMS Feature Routes
router.get('/fraud-summary', adminController.getFraudSummary);
router.get('/audit-chain-verify', adminController.verifyAuditChain);
router.get('/explain-fraud', adminController.getExplainFraud);
router.get('/dbms-concepts', adminController.getDbmsConcepts);

// Phase 2 Advanced Routes
router.get('/laundering-rings', adminController.getMoneyLaunderingRings);
router.post('/point-in-time', adminController.getPointInTimeSnapshot);
router.get('/system-monitor', adminController.getSystemMonitor);

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.delete('/user/:id', adminController.deleteUser);

module.exports = router;