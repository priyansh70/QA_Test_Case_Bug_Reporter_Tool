const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/auth/login', AuthController.login);
router.post('/auth/register', AuthController.register);
router.post('/auth/refresh', AuthController.refreshToken);
router.post('/auth/logout', requireAuth, AuthController.logout);
router.get('/auth/me', requireAuth, AuthController.getMe);
router.put('/user/profile', requireAuth, AuthController.updateProfile);

module.exports = router;
