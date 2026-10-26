const { test } = require('node:test');
const assert = require('node:assert/strict');
const { redactUrl, redactText, sanitizeTarget, sanitizeEvent, isSensitiveField } = require('../extension/redact');

test('redactUrl strips credentials, secret params and token fragments', () => {
  const out = redactUrl('https://bob:hunter2@shop.test/cb?code=abc&state=xyz&page=2&q=shoes#access_token=t0k');
  assert.ok(!out.includes('hunter2') && !out.includes('bob'));
  assert.ok(out.includes('code=[REDACTED]'));
  assert.ok(out.includes('page=2') && out.includes('q=shoes'));
  assert.ok(out.endsWith('#[REDACTED]'));
});

test('redactUrl redacts secret-looking values under innocent names', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig';
  assert.ok(!redactUrl(`https://a.test/?x=${jwt}`).includes('eyJ'));
  assert.ok(!redactUrl('https://a.test/?ref=4111 1111 1111 1111').includes('4111'));
});

test('redactUrl rejects unsupported schemes', () => {
  for (const u of ['javascript:alert(1)', 'chrome://settings', 'file:///etc/passwd', 'not a url', '']) {
    assert.equal(redactUrl(u), null, u);
  }
});

test('redactText masks emails, long numbers and tokens and truncates', () => {
  const out = redactText('Contact jane@corp.com or 555 123 4567 89, key token_dummy_abcdefghijklmnopqrstuvwxyz123456');
  assert.ok(!out.includes('jane@corp.com'));
  assert.ok(!out.includes('555 123 4567'));
  assert.ok(!out.includes('token_dummy_abcdefghijklmnopqrstuvwxyz123456'));
  assert.equal(redactText('word '.repeat(40), 10).length, 11);
});

test('sensitive form fields are masked; values are never kept', () => {
  assert.equal(isSensitiveField({ type: 'password' }), true);
  assert.equal(isSensitiveField({ autocomplete: 'cc-number' }), true);
  assert.equal(isSensitiveField({ name: 'otp_code' }), true);
  assert.equal(isSensitiveField({ name: 'search' }), false);

  const masked = sanitizeTarget({ tag: 'input', type: 'text', name: 'cvv', label: '123', value: '123' });
  assert.deepEqual(masked, { tag: 'input', type: 'text', sensitive: true, label: '[sensitive field]' });

  const button = sanitizeTarget({ tag: 'button', label: 'My Account', value: 'should drop', onclick: 'x' });
  assert.deepEqual(button, { tag: 'button', label: 'My Account' });
});

test('sanitizeEvent whitelists event types and requires seq and timestamp', () => {
  assert.equal(sanitizeEvent({ seq: 1, type: 'keypress', ts: new Date().toISOString() }), null);
  assert.equal(sanitizeEvent({ seq: 0, type: 'click', ts: new Date().toISOString() }), null);
  assert.equal(sanitizeEvent({ seq: 1, type: 'click', ts: 'nope' }), null);
  const ok = sanitizeEvent({ seq: 5, type: 'input', ts: '2026-10-15T09:00:00.000Z', url: 'https://a.test/?password=x', target: { tag: 'input', type: 'password' }, value: 'secret' });
  assert.equal(ok.seq, 5);
  assert.ok(!JSON.stringify(ok).includes('secret'));
  assert.ok(ok.url.includes('password=[REDACTED]'));
});
