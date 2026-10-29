const crypto = require('crypto');

const deriveKey = (secret) => crypto.createHash('sha256').update(secret).digest();

// Old default key, public in the repo. Kept only to decrypt PATs stored before ENCRYPTION_KEY was required.
const LEGACY_KEY = deriveKey('qa-testcase-generator-secret-key-2026');

const configuredSecret = process.env.ENCRYPTION_KEY || process.env.AZURE_PAT_SECRET;
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('ENCRYPTION_KEY must be set in production to encrypt Azure PATs.');
}
if (!configuredSecret) {
  console.warn('ENCRYPTION_KEY is not set; Azure PATs are encrypted with a publicly known key. Set ENCRYPTION_KEY.');
}
const SECRET_KEY = configuredSecret ? deriveKey(configuredSecret) : LEGACY_KEY;

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:';

function decryptWith(key, ivHex, authTagHex, encryptedHex) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(encryptedHex, 'hex', 'utf8') + decipher.final('utf8');
}

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

    try {
      return decryptWith(SECRET_KEY, ...parts);
    } catch (err) {
      if (SECRET_KEY === LEGACY_KEY) throw err;
      return decryptWith(LEGACY_KEY, ...parts);
    }
  } catch (err) {
    console.error('⚠️ [CryptoUtils] Decryption failed:', err.message);
    // Graceful fallback if decryption fails
    return trimmed;
  }
}

/**
 * Re-encrypt a stored value that only the legacy key can open.
 * @param {string} stored Stored 'enc:' payload
 * @returns {string|null} New payload under the current key, or null if no change is needed
 */
function reencryptIfLegacy(stored) {
  if (SECRET_KEY === LEGACY_KEY || !isEncrypted(stored)) return null;
  const parts = stored.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  try {
    decryptWith(SECRET_KEY, ...parts);
    return null;
  } catch {
    try {
      return encryptToken(decryptWith(LEGACY_KEY, ...parts));
    } catch {
      return null;
    }
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  isEncrypted,
  reencryptIfLegacy,
};
