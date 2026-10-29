const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL_S = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production.');
}
// A random fallback secret logs everyone out on restart; set JWT_SECRET outside throwaway dev runs.
const ACCESS_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
// Derived with HMAC so the refresh key differs from the access key even when only JWT_SECRET is set.
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || crypto.createHmac('sha256', ACCESS_SECRET).update('refresh-token').digest('hex');
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using a random secret. Sessions will not survive a restart.');
}

// Revoked/used token ids (jti -> exp ms). Memory is the fast path; MongoDB (`revoked_tokens`, TTL-indexed)
// keeps revocations across restarts and instances. Without a DB connection only memory is used.
const revokedJti = new Map();

function pruneRevoked() {
  const now = Date.now();
  for (const [jti, exp] of revokedJti) if (exp < now) revokedJti.delete(jti);
}

function revokedCollection() {
  try {
    return require('../config/db').getCollection('revoked_tokens');
  } catch {
    return null;
  }
}

async function isRevoked(jti) {
  if (revokedJti.has(jti)) return true;
  const col = revokedCollection();
  if (!col) return false;
  try {
    return Boolean(await col.findOne({ jti }, { projection: { _id: 1 } }));
  } catch (err) {
    console.error('Token revocation lookup failed:', err.message);
    return false;
  }
}

/** Marks a token id revoked. Resolves false if it already was, so a refresh token can be spent only once. */
async function revokeJti(jti, expSeconds) {
  if (revokedJti.has(jti)) return false;
  const col = revokedCollection();
  if (col) {
    try {
      await col.insertOne({ jti, expires_at: new Date(expSeconds * 1000) });
    } catch (err) {
      if (err.code === 11000) {
        revokedJti.set(jti, expSeconds * 1000);
        return false;
      }
      console.error('Token revocation write failed:', err.message);
    }
  }
  revokedJti.set(jti, expSeconds * 1000);
  pruneRevoked();
  return true;
}

// Claims never include the Azure PAT: JWTs are readable by anyone holding them.
function toClaims(user) {
  return { username: user.username, email: user.email, name: user.name, role: user.role };
}

function toSessionUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    azureOrg: user.azureOrg || user.azure_org || null,
    azurePat: user.azurePat || user.azure_pat || null,
  };
}

/** Browser-safe user: the Azure PAT is replaced by a hasAzurePat flag. */
function toPublicUser(user) {
  const { azurePat, ...rest } = toSessionUser(user);
  return { ...rest, hasAzurePat: Boolean(azurePat) };
}

function issueTokens(user) {
  const sessionUser = toSessionUser(user);
  const accessToken = jwt.sign({ ...toClaims(sessionUser), typ: 'access' }, ACCESS_SECRET, {
    subject: sessionUser.id,
    expiresIn: ACCESS_TOKEN_TTL_S,
    jwtid: crypto.randomUUID(),
  });
  const refreshToken = jwt.sign({ typ: 'refresh' }, REFRESH_SECRET, {
    subject: sessionUser.id,
    expiresIn: REFRESH_TOKEN_TTL_S,
    jwtid: crypto.randomUUID(),
  });
  const now = Date.now();
  return {
    accessToken,
    refreshToken,
    user: sessionUser,
    accessExpiresAt: now + ACCESS_TOKEN_TTL_S * 1000,
    refreshExpiresAt: now + REFRESH_TOKEN_TTL_S * 1000,
  };
}

function createSession(user) {
  return issueTokens(user);
}

function decode(token, secret, typ) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return payload.typ === typ ? payload : null;
  } catch {
    return null;
  }
}

/** Verifies an access JWT and returns the claims-only user (no Azure credentials), or null. */
function verifyToken(token) {
  const p = decode(token, ACCESS_SECRET, 'access');
  if (!p) return null;
  return { id: p.sub, username: p.username, email: p.email, name: p.name, role: p.role };
}

/**
 * verifyToken + fresh user (incl. Azure org/PAT) from MongoDB, so profile changes apply
 * immediately and the PAT never travels inside the token. Falls back to the claims if the
 * user record cannot be loaded.
 */
async function resolveUser(token) {
  const payload = decode(token, ACCESS_SECRET, 'access');
  if (!payload || (await isRevoked(payload.jti))) return null;
  const claims = verifyToken(token);
  if (!claims) return null;
  try {
    const UserModel = require('../models/User');
    const doc = await UserModel.findById(claims.id);
    if (doc) return toSessionUser(doc);
  } catch {
    // fall through to claims
  }
  return claims;
}

async function verifyRefreshToken(refreshToken) {
  const p = decode(refreshToken, REFRESH_SECRET, 'refresh');
  if (!p || (await isRevoked(p.jti))) return null;
  return p;
}

async function rotateRefreshToken(oldRefreshToken) {
  const p = await verifyRefreshToken(oldRefreshToken);
  if (!p) return null;

  // Load the user before spending the token so a DB error does not burn a valid session.
  let user;
  try {
    const UserModel = require('../models/User');
    user = await UserModel.findById(p.sub);
  } catch {
    return null;
  }
  if (!user) return null; // user deleted: end the session

  // Spend the token atomically; a concurrent or replayed refresh loses the race and gets null.
  if (!(await revokeJti(p.jti, p.exp))) return null;
  return issueTokens(user);
}

/** Logout: access JWTs carry a jti too, so the one used for logout stops working immediately. */
async function revokeToken(accessToken) {
  const p = decode(accessToken, ACCESS_SECRET, 'access');
  if (p) await revokeJti(p.jti, p.exp);
}

async function revokeRefreshToken(refreshToken) {
  const p = decode(refreshToken, REFRESH_SECRET, 'refresh');
  if (p) await revokeJti(p.jti, p.exp);
}

// User data is re-read from MongoDB on every request, so nothing to sync.
function updateSessionUser() {}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const user = await resolveUser(token);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token.' });
  }

  req.user = user;
  req.token = token;
  next();
}

module.exports = {
  createSession,
  toPublicUser,
  verifyToken,
  resolveUser,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeRefreshToken,
  updateSessionUser,
  requireAuth,
};
