const crypto = require('crypto');

// Derive 32-byte key from environment secret or fallback key
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || process.env.AZURE_PAT_SECRET || 'qa-testcase-generator-secret-key-2026')
  .digest();

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:';

/**
 * Check if a token string is already encrypted
 * @param {string} text
 * @returns {boolean}
 */
function isEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX);
}

/**
 * Encrypt a plain-text token string using AES-256-GCM
 * @param {string} text Plain-text token
 * @returns {string|null} Encrypted payload string with 'enc:' prefix
 */
function encryptToken(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // If already encrypted, do not double-encrypt
  if (isEncrypted(trimmed)) {
    return trimmed;
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  
  let encrypted = cipher.update(trimmed, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted token payload back to plain-text
 * @param {string} text Encrypted payload or plain-text legacy token
 * @returns {string|null} Decrypted plain-text token
 */
function decryptToken(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // If not encrypted (legacy unencrypted record), return as-is
  if (!isEncrypted(trimmed)) {
    return trimmed;
  }

  try {
    const payload = trimmed.slice(PREFIX.length);
    const parts = payload.split(':');
    if (parts.length !== 3) {
      return trimmed;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('⚠️ [CryptoUtils] Decryption failed:', err.message);
    // Graceful fallback if decryption fails
    return trimmed;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  isEncrypted,
};
