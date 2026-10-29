const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL_S = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_S = 7 * 24 * 60 * 60; // 7 days

// shortcut: random fallback secret logs everyone out on restart, set JWT_SECRET in production
const ACCESS_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${ACCESS_SECRET}:refresh`;
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; using a random secret. Sessions will not survive a restart.');
}

// shortcut: in-memory revocation of used/logged-out refresh tokens (jti -> exp ms), move to MongoDB for multi-instance
const revokedRefresh = new Map();

function pruneRevoked() {
  const now = Date.now();
  for (const [jti, exp] of revokedRefresh) if (exp < now) revokedRefresh.delete(jti);
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

function issueTokens(user) {
  const sessionUser = toSessionUser(user);
  const accessToken = jwt.sign({ ...toClaims(sessionUser), typ: 'access' }, ACCESS_SECRET, {
    subject: sessionUser.id,
    expiresIn: ACCESS_TOKEN_TTL_S,
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

function verifyRefreshToken(refreshToken) {
  const p = decode(refreshToken, REFRESH_SECRET, 'refresh');
  if (!p || revokedRefresh.has(p.jti)) return null;
  return p;
}

async function rotateRefreshToken(oldRefreshToken) {
  const p = verifyRefreshToken(oldRefreshToken);
  if (!p) return null;
  revokedRefresh.set(p.jti, p.exp * 1000);
  pruneRevoked();

  let user = { id: p.sub };
  try {
    const UserModel = require('../models/User');
    const doc = await UserModel.findById(p.sub);
    if (!doc) return null; // user deleted: end the session
    user = doc;
  } catch {
    return null;
  }
  return issueTokens(user);
}

// Access JWTs are stateless and expire in 15 min; logout revokes the refresh token.
function revokeToken() {}

function revokeRefreshToken(refreshToken) {
  const p = decode(refreshToken, REFRESH_SECRET, 'refresh');
  if (p) revokedRefresh.set(p.jti, p.exp * 1000);
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
  verifyToken,
  resolveUser,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeRefreshToken,
  updateSessionUser,
  requireAuth,
};
