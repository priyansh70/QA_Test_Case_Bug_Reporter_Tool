const express = require('express');
const router = express.Router();
const BugController = require('../controllers/bugController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/bugs/generate', requireAuth, BugController.generateBug);
router.get('/bugs', requireAuth, BugController.getBugs);
router.post('/bugs/publish', requireAuth, BugController.publishBug);

module.exports = router;
