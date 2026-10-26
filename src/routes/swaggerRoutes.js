const express = require('express');
const router = express.Router();
const { swaggerSpec } = require('../config/swagger');

// Raw OpenAPI 3.0 JSON specification endpoints
router.get('/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

router.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Friendly redirect from /api/docs to Swagger UI
router.get('/docs', (req, res) => {
  res.redirect('/api-docs');
});

module.exports = router;
