const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { loginLimiter, registerLimiter, refreshLimiter } = require('../middlewares/securityMiddleware');

router.post('/auth/login', loginLimiter, AuthController.login);
router.post('/auth/register', registerLimiter, AuthController.register);
router.post('/auth/refresh', refreshLimiter, AuthController.refreshToken);
router.post('/auth/logout', requireAuth, AuthController.logout);
router.get('/auth/me', requireAuth, AuthController.getMe);
router.put('/user/profile', requireAuth, AuthController.updateProfile);

module.exports = router;
