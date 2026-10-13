const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const testSuiteRoutes = require('./testSuiteRoutes');
const bugRoutes = require('./bugRoutes');
const azureRoutes = require('./azureRoutes');

router.use(authRoutes);
router.use(testSuiteRoutes);
router.use(bugRoutes);
router.use(azureRoutes);

module.exports = router;
