const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules } = require('../middleware/validate');

// Apply strict rate limiting to all auth routes
router.use(authLimiter);

router.post('/register', registerRules, authController.register);
router.post('/login', loginRules, authController.login);
router.post('/logout', authController.logout);

module.exports = router;