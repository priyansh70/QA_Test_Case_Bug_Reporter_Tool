const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const apiRoutes = require('./routes');
const BugController = require('./controllers/bugController');
const TestSuiteController = require('./controllers/testSuiteController');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public, unauthenticated bug report page shared via the public link generated on publish.
app.get('/bugs/public/:id', BugController.renderPublicBug);

// Public, unauthenticated test suite page shared via the public link generated on generate.
app.get('/test-suites/public/:id', TestSuiteController.renderPublicSuite);

// Register API Routes
app.use('/api', apiRoutes);

// Explicit 404 handler for API routes (prevent falling through to SPA index.html)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// Centralized error handling for API routes
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.path.startsWith('/api') || req.originalUrl?.startsWith('/api')) {
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: 'The server ran into a problem. Please try again in a moment.',
    });
  }
  next(err);
});

// Serve static frontend files from 'client/dist' (built React app) or 'public'
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
const publicDir = path.join(__dirname, '..', 'public');
const staticDir = fs.existsSync(clientDistDir) ? clientDistDir : publicDir;
app.use(express.static(staticDir));

// SPA Routing Fallback
app.use((req, res) => {
  const indexFile = fs.existsSync(path.join(clientDistDir, 'index.html'))
    ? path.join(clientDistDir, 'index.html')
    : path.join(publicDir, 'index.html');
  res.sendFile(indexFile);
});

module.exports = app;
