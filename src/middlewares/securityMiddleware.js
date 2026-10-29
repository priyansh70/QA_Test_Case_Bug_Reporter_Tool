const rateLimit = require('express-rate-limit');

const limiter = (windowMs, limit, error) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ success: false, error }),
  });

// shortcut: per-IP, in-memory counters; use a shared store (Redis/Mongo) before running several instances.
const loginLimiter = limiter(15 * 60 * 1000, 20, 'Too many login attempts. Please try again in a few minutes.');
const registerLimiter = limiter(60 * 60 * 1000, 10, 'Too many sign-ups from this address. Please try again later.');
const refreshLimiter = limiter(15 * 60 * 1000, 120, 'Too many session refreshes. Please try again shortly.');
// Every call spends the operator's LLM budget.
const generateLimiter = limiter(60 * 60 * 1000, 60, 'Generation limit reached. Please try again later.');

const ALLOWED_PROVIDERS = ['openai', 'gemini', 'google', 'claude', 'anthropic', 'openrouter'];
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,99}$/;

/** Rejects a client-chosen provider/model that is not an allowlisted provider or a plain model id. */
function validateAiOptions(req, res, next) {
  const { provider, model } = req.body || {};
  if (provider !== undefined && provider !== null && provider !== '') {
    if (typeof provider !== 'string' || !ALLOWED_PROVIDERS.includes(provider.trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Unsupported AI provider.' });
    }
  }
  if (model !== undefined && model !== null && model !== '') {
    if (typeof model !== 'string' || !MODEL_PATTERN.test(model.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid AI model name.' });
    }
  }
  next();
}

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  generateLimiter,
  validateAiOptions,
};
