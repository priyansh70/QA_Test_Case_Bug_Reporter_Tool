const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({ server, baseUrl });
    });
  });
}

function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

test('Swagger API Documentation Endpoints', async (t) => {
  const { server, baseUrl } = await startServer();

  t.after(async () => {
    await stopServer(server);
  });

  await t.test('GET /api-docs/ serves Swagger UI HTML page', async () => {
    const res = await fetch(`${baseUrl}/api-docs/`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/html'), `Expected HTML, got ${contentType}`);
    const text = await res.text();
    assert.ok(text.includes('Swagger UI') || text.includes('swagger-ui'), 'Expected Swagger UI page content');
  });

  await t.test('GET /api-docs.json returns valid OpenAPI 3.0 JSON specification', async () => {
    const res = await fetch(`${baseUrl}/api-docs.json`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'), `Expected JSON, got ${contentType}`);

    const spec = await res.json();
    assert.equal(spec.openapi, '3.0.0');
    assert.ok(spec.info && spec.info.title.includes('QA Test Suite'));
    assert.ok(spec.paths && Object.keys(spec.paths).length >= 25);
    assert.ok(spec.components && spec.components.securitySchemes);
    assert.ok(spec.components.securitySchemes.bearerAuth);
    assert.ok(spec.components.securitySchemes.sessionTokenAuth);
  });

  await t.test('GET /api/swagger.json returns identical valid OpenAPI JSON specification', async () => {
    const res = await fetch(`${baseUrl}/api/swagger.json`);
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.0.0');
    assert.ok(spec.paths['/api/auth/login']);
    assert.ok(spec.paths['/api/generate']);
    assert.ok(spec.paths['/api/testing-sessions']);
  });

  await t.test('GET /api/api-docs.json returns OpenAPI JSON specification', async () => {
    const res = await fetch(`${baseUrl}/api/api-docs.json`);
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.0.0');
  });

  await t.test('GET /docs redirects to /api-docs', async () => {
    const res = await fetch(`${baseUrl}/docs`, { redirect: 'manual' });
    assert.ok([301, 302].includes(res.status), `Expected redirect, got ${res.status}`);
    assert.equal(res.headers.get('location'), '/api-docs');
  });

  await t.test('GET /api/docs redirects to /api-docs', async () => {
    const res = await fetch(`${baseUrl}/api/docs`, { redirect: 'manual' });
    assert.ok([301, 302].includes(res.status), `Expected redirect, got ${res.status}`);
    assert.equal(res.headers.get('location'), '/api-docs');
  });

  await t.test('OpenAPI specification includes all expected endpoint tags and schemas', async () => {
    const res = await fetch(`${baseUrl}/api-docs.json`);
    const spec = await res.json();

    const tagNames = (spec.tags || []).map((t) => t.name);
    assert.ok(tagNames.includes('Authentication'));
    assert.ok(tagNames.includes('Azure DevOps'));
    assert.ok(tagNames.includes('Test Suites'));
    assert.ok(tagNames.includes('AI Bug Reporter'));
    assert.ok(tagNames.includes('Testing Sessions'));
    assert.ok(tagNames.includes('Captured Bugs'));
    assert.ok(tagNames.includes('Public Shared Views'));

    // Verify key schemas
    const schemaNames = Object.keys(spec.components.schemas || {});
    assert.ok(schemaNames.includes('UserProfile'));
    assert.ok(schemaNames.includes('AuthSuccessResponse'));
    assert.ok(schemaNames.includes('AzureWorkItemDetail'));
    assert.ok(schemaNames.includes('GenerateTestSuiteRequest'));
    assert.ok(schemaNames.includes('BugReportContent'));
    assert.ok(schemaNames.includes('TestingSessionSummary'));
    assert.ok(schemaNames.includes('CapturedBugDetail'));
  });
});
