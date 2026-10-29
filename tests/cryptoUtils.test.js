const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

function load(env) {
  const saved = { ...process.env };
  delete process.env.ENCRYPTION_KEY;
  delete process.env.AZURE_PAT_SECRET;
  Object.assign(process.env, env);
  delete require.cache[require.resolve('../src/utils/cryptoUtils')];
  try {
    return require('../src/utils/cryptoUtils');
  } finally {
    process.env = saved;
  }
}

test('production without ENCRYPTION_KEY refuses to load', () => {
  assert.throws(() => load({ NODE_ENV: 'production' }), /ENCRYPTION_KEY/);
});

test('round trips under the configured key', () => {
  const c = load({ NODE_ENV: 'test', ENCRYPTION_KEY: 'k1' });
  assert.strictEqual(c.decryptToken(c.encryptToken('pat-123')), 'pat-123');
});

test('legacy-key PATs still decrypt and are re-encrypted under the new key', () => {
  const legacy = load({ NODE_ENV: 'test' }).encryptToken('old-pat');
  const c = load({ NODE_ENV: 'test', ENCRYPTION_KEY: 'k2' });
  assert.strictEqual(c.decryptToken(legacy), 'old-pat');
  const next = c.reencryptIfLegacy(legacy);
  assert.ok(next && next !== legacy);
  assert.strictEqual(c.decryptToken(next), 'old-pat');
  assert.strictEqual(c.reencryptIfLegacy(next), null);
  // a key unrelated to the new one cannot open it
  const other = load({ NODE_ENV: 'test', ENCRYPTION_KEY: crypto.randomBytes(8).toString('hex') });
  assert.notStrictEqual(other.decryptToken(next), 'old-pat');
});
