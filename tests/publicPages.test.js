/**
 * Integration tests for public pages, link/ID generation, security headers, CORS and body limits.
 * Uses a throwaway MongoDB database on the configured MONGO_URL.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_DB_NAME = `qa_test_public_${process.pid}`;

const { initDatabase, getDb } = require('../src/config/db');
const app = require('../src/app');
const { newId, publicUrl, safeHttpUrl } = require('../src/utils/publicLinks');

let server;
let base;
let token;

async function call(method, url, { body, headers = {}, raw } = {}) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return res;
}

before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const reg = await (
    await call('POST', '/api/auth/register', { body: { email: 'pub@x.io', password: 'correct horse' } })
  ).json();
  token = reg.token;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const db = getDb();
  await db.dropDatabase();
  await db.client.close();
});

const publish = (extra = {}) =>
  call('POST', '/api/bugs/publish', {
    headers: { Authorization: `Bearer ${token}` },
    body: { bugReport: { title: 'Broken <b>button</b>', description: 'd' }, ...extra },
  });

test('publishing rejects non-http media URLs and accepts https ones', async () => {
  assert.equal((await publish({ mediaUrl: 'javascript:alert(1)' })).status, 400);
  assert.equal((await publish({ mediaUrl: 'data:text/html,<script>1</script>' })).status, 400);
  const ok = await publish({ mediaUrl: 'https://example.com/video.mp4' });
  assert.equal(ok.status, 200);
});

test('public page escapes content, hides unsafe stored URLs and is not indexable', async () => {
  const { bugId } = await (await publish()).json();
  // A row stored before the publish-time check could still hold a hostile URL.
  await getDb().collection('bugs').updateOne({ id: bugId }, { $set: { media_url: 'javascript:alert(1)' } });

  const res = await call('GET', `/bugs/public/${bugId}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('x-robots-tag'), /noindex/);
  const html = await res.text();
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('<b>button</b>'));
  assert.ok(html.includes('&lt;b&gt;button&lt;/b&gt;'));
});

test('ids are long random tokens and links ignore a forged Host header', () => {
  const a = newId('bug');
  assert.match(a, /^bug_\d+_[0-9a-f]{32}$/);
  assert.notEqual(a, newId('bug'));

  const req = (host) => ({ protocol: 'https', get: () => host });
  assert.equal(publicUrl(req('app.example.com'), '/x'), 'https://app.example.com/x');
  assert.match(publicUrl(req('evil.com/phish?'), '/x'), /^https:\/\/localhost:\d+\/x$/);
  process.env.PUBLIC_BASE_URL = 'https://qa.example.com/';
  try {
    assert.equal(publicUrl(req('evil.com'), '/x'), 'https://qa.example.com/x');
  } finally {
    delete process.env.PUBLIC_BASE_URL;
  }
  assert.equal(safeHttpUrl('ftp://x'), null);
  assert.equal(safeHttpUrl('not a url'), null);
});

test('responses carry security headers', async () => {
  const res = await call('GET', '/api/config', { headers: { Authorization: `Bearer ${token}` } });
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('CORS only allows known origins', async () => {
  const allowed = await call('GET', '/api/config', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const ext = await call('GET', '/api/config', { headers: { Origin: 'chrome-extension://abcdef' } });
  assert.equal(ext.headers.get('access-control-allow-origin'), 'chrome-extension://abcdef');
  const denied = await call('GET', '/api/config', { headers: { Origin: 'https://evil.example' } });
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('auth endpoints reject oversized bodies', async () => {
  const res = await call('POST', '/api/auth/login', { raw: JSON.stringify({ username: 'a', password: 'x'.repeat(200000) }) });
  assert.equal(res.status, 413);
});
