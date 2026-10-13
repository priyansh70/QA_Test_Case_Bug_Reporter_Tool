const express = require('express');
const router = express.Router();
const TestSuiteController = require('../controllers/testSuiteController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/generate', requireAuth, TestSuiteController.generate);
router.get('/history', requireAuth, TestSuiteController.getHistory);
router.get('/history/:id', requireAuth, TestSuiteController.getHistoryById);
router.get('/scripts', requireAuth, TestSuiteController.getScripts);

module.exports = router;
