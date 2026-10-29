const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const auth = require('../src/middlewares/authMiddleware');

const user = { id: 'u1', username: 'a', email: 'a@x.io', name: 'A', role: 'user', azureOrg: 'o', azurePat: 'secretpat' };

test('access token is a JWT without the PAT and verifies', () => {
  const s = auth.createSession(user);
  assert.ok(!JSON.stringify(jwt.decode(s.accessToken)).includes('secretpat'));
  assert.strictEqual(auth.verifyToken(s.accessToken).id, 'u1');
  assert.strictEqual(auth.verifyToken(s.refreshToken), null); // refresh token is not an access token
  assert.strictEqual(auth.verifyToken(s.accessToken + 'x'), null);
});

test('refresh token verifies, and logout revokes it', () => {
  const s = auth.createSession(user);
  assert.ok(auth.verifyRefreshToken(s.refreshToken));
  auth.revokeRefreshToken(s.refreshToken);
  assert.strictEqual(auth.verifyRefreshToken(s.refreshToken), null);
});
