const express = require('express');
const router = express.Router();
const AzureController = require('../controllers/azureController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/config', requireAuth, AzureController.getConfig);
router.get('/azure/projects', requireAuth, AzureController.getProjects);
router.get('/azure/users', requireAuth, AzureController.getUsers);
router.get('/azure/work-items', requireAuth, AzureController.getWorkItems);
router.get('/azure/iterations', requireAuth, AzureController.getIterations);
router.get('/azure/work-item/:id', requireAuth, AzureController.getWorkItemById);
router.patch('/azure/work-item/:id', requireAuth, AzureController.updateWorkItem);

module.exports = router;
