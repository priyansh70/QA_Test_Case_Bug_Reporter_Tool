const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const testSuiteRoutes = require('./testSuiteRoutes');
const bugRoutes = require('./bugRoutes');
const azureRoutes = require('./azureRoutes');
const testingSessionRoutes = require('./testingSessionRoutes');
const swaggerRoutes = require('./swaggerRoutes');

router.use(authRoutes);
router.use(testSuiteRoutes);
router.use(bugRoutes);
router.use(azureRoutes);
router.use(testingSessionRoutes);
router.use(swaggerRoutes);

module.exports = router;
