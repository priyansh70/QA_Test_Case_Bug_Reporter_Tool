const crypto = require('crypto');

/** Unguessable record id such as `bug_<ms>_<128 random bits>`; ids double as public-link tokens. */
function newId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
}

const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

/**
 * Absolute URL for a public page. PUBLIC_BASE_URL wins; otherwise the Host header is used only if it is a
 * plain host[:port], so a forged header cannot inject a hostile link into stored data or Azure bugs.
 */
function publicUrl(req, pathname) {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return `${configured}${pathname}`;
  const host = req.get('host');
  const safeHost = host && HOST_PATTERN.test(host) ? host : `localhost:${process.env.PORT || 3000}`;
  return `${req.protocol}://${safeHost}${pathname}`;
}

/** Returns the normalized URL if it is http(s), else null (blocks javascript:, data:, etc.). */
function safeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

module.exports = { newId, publicUrl, safeHttpUrl };
