/**
 * Privacy redaction helpers shared by the Chrome extension (loaded as a plain script)
 * and the Express backend (required as a CommonJS module) so both sides apply the same rules.
 * Typed values are never recorded; these helpers scrub URLs and short element labels.
 */
(function (root) {
  const SENSITIVE_NAME = /pass|pwd|token|secret|auth|session|\bsid\b|key\b|code|sig|jwt|otp|\bpin\b|card|cvv|cvc|ssn|credential|iban/i;
  const FORM_TAGS = ['input', 'textarea', 'select'];
  const SENSITIVE_AUTOCOMPLETE = /password|cc-|one-time-code/i;
  const REDACTED = '[REDACTED]';
  const ALLOWED_EVENT_TYPES = ['page_load', 'navigation', 'click', 'input', 'submit'];

  function looksLikeSecret(value) {
    const v = String(value || '');
    return (
      /^eyJ[\w-]+\.[\w-]+\./.test(v) || // JWT
      /^[A-Za-z0-9+/_=-]{32,}$/.test(v) || // long opaque token
      /\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,7}/.test(v) // card-like number
    );
  }

  function redactText(text, max = 80) {
    if (text === undefined || text === null) return '';
    let s = String(text).replace(/\s+/g, ' ').trim();
    s = s
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
      .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, REDACTED)
      .replace(/\b[A-Za-z0-9+/_-]{32,}\b/g, REDACTED)
      .replace(/(?:\d[ -]?){9,}/g, '[number]');
    return s.length > max ? `${s.slice(0, max)}…` : s;
  }

  /** Returns a scrubbed http(s) URL string, or null when the URL is unsupported/invalid. */
  function redactUrl(raw) {
    let url;
    try {
      url = new URL(String(raw || ''));
    } catch (e) {
      return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.username = '';
    url.password = '';
    const keys = Array.from(new Set(Array.from(url.searchParams.keys())));
    for (const key of keys) {
      const values = url.searchParams.getAll(key);
      if (SENSITIVE_NAME.test(key) || values.some(looksLikeSecret)) {
        url.searchParams.set(key, REDACTED);
      }
    }
    // OAuth implicit-flow fragments (#access_token=...) and other key=value fragments.
    if (url.hash && (/=/.test(url.hash) || looksLikeSecret(url.hash.slice(1)))) url.hash = REDACTED;
    const out = url.toString().replace(/%5BREDACTED%5D/g, REDACTED);
    return out.length > 2048 ? out.slice(0, 2048) : out;
  }

  /** True when an element (or a plain descriptor of one) holds data that must never be described. */
  function isSensitiveField(desc) {
    if (!desc) return false;
    const type = String(desc.type || '').toLowerCase();
    if (type === 'password' || type === 'hidden') return true;
    if (SENSITIVE_AUTOCOMPLETE.test(String(desc.autocomplete || ''))) return true;
    return [desc.name, desc.id, desc.label].some((v) => v && SENSITIVE_NAME.test(String(v)));
  }

  /** Whitelists and scrubs the element metadata attached to an event. Values are never kept. */
  function sanitizeTarget(target) {
    if (!target || typeof target !== 'object') return null;
    const isFormField = FORM_TAGS.includes(String(target.tag || '').toLowerCase());
    if (target.sensitive || (isFormField && isSensitiveField(target))) {
      return { tag: redactText(target.tag, 20), type: redactText(target.type, 20), sensitive: true, label: '[sensitive field]' };
    }
    const out = {};
    for (const [k, max] of [['tag', 20], ['type', 20], ['id', 60], ['name', 60], ['role', 30], ['testId', 60], ['selector', 200], ['label', 80]]) {
      if (target[k]) out[k] = redactText(target[k], max);
    }
    return out;
  }

  /** Normalizes one raw recorder event; returns null if it is unusable. */
  function sanitizeEvent(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const seq = Number(raw.seq);
    if (!Number.isInteger(seq) || seq < 1) return null;
    if (!ALLOWED_EVENT_TYPES.includes(raw.type)) return null;
    const ts = new Date(raw.ts);
    if (Number.isNaN(ts.getTime())) return null;
    return {
      seq,
      type: raw.type,
      url: redactUrl(raw.url),
      title: redactText(raw.title, 120),
      ts: ts.toISOString(),
      target: sanitizeTarget(raw.target),
    };
  }

  const api = { redactText, redactUrl, isSensitiveField, sanitizeTarget, sanitizeEvent, ALLOWED_EVENT_TYPES, REDACTED };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QARedact = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
