/**
 * Integration tests for registration/login hardening, token revocation and the AI option allowlist.
 * Uses a throwaway MongoDB database on the configured MONGO_URL.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.MONGO_DB_NAME = `qa_test_auth_${process.pid}`;

const { initDatabase, getDb } = require('../src/config/db');
const app = require('../src/app');

let server;
let base;

async function api(method, url, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  await initDatabase();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const db = getDb();
  await db.dropDatabase();
  await db.client.close();
});

test('registration enforces password length and never returns the Azure PAT', async () => {
  const short = await api('POST', '/api/auth/register', { body: { email: 'short@x.io', password: 'abc' } });
  assert.equal(short.status, 400);

  const ok = await api('POST', '/api/auth/register', {
    body: { email: 'new@x.io', password: 'correct horse', azureOrg: 'org', azurePat: 'secret-pat' },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.hasAzurePat, true);
  assert.ok(!JSON.stringify(ok.body).includes('secret-pat'));

  const me = await api('GET', '/api/auth/me', { token: ok.body.token });
  assert.equal(me.status, 200);
  assert.ok(!JSON.stringify(me.body).includes('secret-pat'));

  const stored = await getDb().collection('users').findOne({ email: 'new@x.io' });
  assert.equal(stored.hash_algo, 'scrypt');
  assert.ok(stored.azure_pat.startsWith('enc:'));
});

test('login rejects bad credentials and regex-looking identifiers', async () => {
  const wrong = await api('POST', '/api/auth/login', { body: { username: 'new@x.io', password: 'nope nope' } });
  assert.equal(wrong.status, 401);
  const regex = await api('POST', '/api/auth/login', { body: { username: '.*', password: 'correct horse' } });
  assert.equal(regex.status, 401);
  const object = await api('POST', '/api/auth/login', { body: { username: { $ne: '' }, password: 'x' } });
  assert.equal(object.status, 401);
  const good = await api('POST', '/api/auth/login', { body: { username: 'NEW@x.io', password: 'correct horse' } });
  assert.equal(good.status, 200);
});

test('legacy PBKDF2 accounts can log in and are upgraded to scrypt', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('old password', salt, 1000, 64, 'sha512').toString('hex');
  await getDb().collection('users').insertOne({ id: 'usr_legacy', username: 'legacy@x.io', email: 'legacy@x.io', hash, salt });

  const first = await api('POST', '/api/auth/login', { body: { username: 'legacy@x.io', password: 'old password' } });
  assert.equal(first.status, 200);
  const upgraded = await getDb().collection('users').findOne({ id: 'usr_legacy' });
  assert.equal(upgraded.hash_algo, 'scrypt');
  assert.notEqual(upgraded.hash, hash);

  const second = await api('POST', '/api/auth/login', { body: { username: 'legacy@x.io', password: 'old password' } });
  assert.equal(second.status, 200);
});

test('a refresh token works once; replay fails and the revocation is persisted', async () => {
  const login = await api('POST', '/api/auth/login', { body: { username: 'new@x.io', password: 'correct horse' } });
  const { refreshToken } = login.body;

  const first = await api('POST', '/api/auth/refresh', { body: { refreshToken } });
  assert.equal(first.status, 200);
  const replay = await api('POST', '/api/auth/refresh', { body: { refreshToken } });
  assert.equal(replay.status, 401);

  assert.equal(await getDb().collection('revoked_tokens').countDocuments(), 1);
});

test('logout invalidates the access token and the refresh token', async () => {
  const login = await api('POST', '/api/auth/login', { body: { username: 'new@x.io', password: 'correct horse' } });
  const { token, refreshToken } = login.body;
  const out = await api('POST', '/api/auth/logout', { token, body: { refreshToken } });
  assert.equal(out.status, 200);

  assert.equal((await api('GET', '/api/auth/me', { token })).status, 401);
  assert.equal((await api('POST', '/api/auth/refresh', { body: { refreshToken } })).status, 401);
});

test('generation endpoints reject unknown providers and malformed model names', async () => {
  const login = await api('POST', '/api/auth/login', { body: { username: 'new@x.io', password: 'correct horse' } });
  const token = login.body.token;
  const badProvider = await api('POST', '/api/generate', { token, body: { workItemId: '1', provider: 'evil' } });
  assert.equal(badProvider.status, 400);
  const badModel = await api('POST', '/api/bugs/generate', { token, body: { bugTitle: 't', model: '../../x; rm' } });
  assert.equal(badModel.status, 400);
});

test('login is rate limited', async () => {
  let limited = false;
  for (let i = 0; i < 40 && !limited; i += 1) {
    const res = await api('POST', '/api/auth/login', { body: { username: 'new@x.io', password: 'wrong wrong' } });
    limited = res.status === 429;
  }
  assert.ok(limited, 'expected a 429 after repeated logins');
});
