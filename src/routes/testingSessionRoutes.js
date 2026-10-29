const express = require('express');
const router = express.Router();
const TestingSessionController = require('../controllers/testingSessionController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { generateLimiter, validateAiOptions } = require('../middlewares/securityMiddleware');
const { requireSessionAccess } = require('../middlewares/sessionAuthMiddleware');

// Owner-only (React dashboard)
router.post('/testing-sessions', requireAuth, TestingSessionController.createSession);
router.get('/testing-sessions', requireAuth, TestingSessionController.listSessions);
router.get('/testing-sessions/:id', requireAuth, TestingSessionController.getSession);
router.delete('/testing-sessions/:id', requireAuth, TestingSessionController.deleteSession);
router.get('/testing-sessions/:id/events',requireAuth, TestingSessionController.getEvents);
router.get('/testing-sessions/:id/bugs', requireAuth, TestingSessionController.listBugs);
router.post('/testing-sessions/:id/connect-token', requireAuth, TestingSessionController.rotateConnectToken);

// Owner or Chrome extension holding the session-scoped connect token
router.post('/testing-sessions/:id/connect', requireSessionAccess, TestingSessionController.connect);
router.post('/testing-sessions/:id/events/batch', requireSessionAccess, TestingSessionController.ingestEvents);
router.post('/testing-sessions/:id/bugs', requireSessionAccess, TestingSessionController.captureBug);
router.post('/testing-sessions/:id/stop', requireSessionAccess, TestingSessionController.stopSession);

// Captured bug review (owner-only)
router.get('/captured-bugs/:bugId', requireAuth, TestingSessionController.getBug);
router.patch('/captured-bugs/:bugId', requireAuth, TestingSessionController.updateBug);
router.delete('/captured-bugs/:bugId', requireAuth, TestingSessionController.deleteBug);
router.get('/captured-bugs/:bugId/screenshot', requireAuth, TestingSessionController.getScreenshot);
router.post('/captured-bugs/:bugId/generate', requireAuth, generateLimiter, validateAiOptions, TestingSessionController.generateReport);
router.post('/captured-bugs/:bugId/create-azure-bug', requireAuth, TestingSessionController.createAzureBug);

module.exports = router;
