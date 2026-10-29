const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const apiRoutes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec, swaggerUiOptions } = require('./config/swagger');
const BugController = require('./controllers/bugController');
const TestSuiteController = require('./controllers/testSuiteController');

const app = express();

// Behind a reverse proxy set TRUST_PROXY to the hop count so rate limits see the real client IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': null,
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Browser origins allowed to call the API. Requests without an Origin (curl, server-to-server) are unaffected,
// and the recorder extension (chrome-extension://) is allowed; extend the list with CORS_ORIGINS=a,b.
const allowedOrigins = new Set(
  [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    process.env.PUBLIC_BASE_URL,
    ...(process.env.CORS_ORIGINS || '').split(','),
  ]
    .map((o) => (o || '').trim().replace(/\/+$/, ''))
    .filter(Boolean)
);
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.has(origin) || origin.startsWith('chrome-extension://')),
  })
);

// Session/extension endpoints get a tighter body limit (one ~5 MB screenshot as base64 + metadata);
// once parsed here, the global parser below skips the request.
app.use('/api/testing-sessions', express.json({ limit: '8mb' }));
app.use('/api/captured-bugs', express.json({ limit: '1mb' }));
// Unauthenticated and profile endpoints only ever carry a few short fields.
app.use(['/api/auth', '/api/user'], express.json({ limit: '100kb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Swagger API Documentation UI & raw OpenAPI 3.0 specification (off in production unless ENABLE_API_DOCS=true)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
  app.get('/docs', (req, res) => res.redirect('/api-docs'));
}

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

// // Serve static frontend files from 'client/dist' (built React app) or 'public'
// const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
// const publicDir = path.join(__dirname, '..', 'public');
// const staticDir = fs.existsSync(clientDistDir) ? clientDistDir : publicDir;
// app.use(express.static(staticDir));

// // SPA Routing Fallback
// app.use((req, res) => {
//   const indexFile = fs.existsSync(path.join(clientDistDir, 'index.html'))
//     ? path.join(clientDistDir, 'index.html')
//     : path.join(publicDir, 'index.html');
//   res.sendFile(indexFile);
// });

// Clean React-only static serving:
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}
app.use((req, res) => {
  const indexFile = path.join(clientDistDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  res.status(404).send('Frontend not built. Please run "npm run build" in the client directory.');
});

module.exports = app;
