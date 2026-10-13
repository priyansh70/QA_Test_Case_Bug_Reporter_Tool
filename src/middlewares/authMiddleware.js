const crypto = require('crypto');

const activeTokens = new Map();
const refreshTokens = new Map();

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function createSession(user) {
  const accessToken = `qatk_${crypto.randomBytes(32).toString('hex')}`;
  const refreshToken = `qatk_rft_${crypto.randomBytes(32).toString('hex')}`;
  const accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS;
  const refreshExpiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;

  const sessionUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    azureOrg: user.azureOrg || user.azure_org || null,
    azurePat: user.azurePat || user.azure_pat || null,
  };

  activeTokens.set(accessToken, {
    token: accessToken,
    user: sessionUser,
    expiresAt: accessExpiresAt,
  });

  refreshTokens.set(refreshToken, {
    token: refreshToken,
    user: sessionUser,
    accessToken,
    expiresAt: refreshExpiresAt,
  });

  return {
    accessToken,
    refreshToken,
    user: sessionUser,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

function verifyToken(token) {
  if (!token) return null;
  const session = activeTokens.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeTokens.delete(token);
    return null;
  }

  return session.user;
}

function verifyRefreshToken(refreshToken) {
  if (!refreshToken) return null;
  const record = refreshTokens.get(refreshToken);
  if (!record) return null;

  if (Date.now() > record.expiresAt) {
    refreshTokens.delete(refreshToken);
    return null;
  }

  return record;
}

function rotateRefreshToken(oldRefreshToken) {
  const record = refreshTokens.get(oldRefreshToken);
  if (!record) return null;

  // Invalidate old refresh token (rotation)
  refreshTokens.delete(oldRefreshToken);
  // Also invalidate the old access token
  activeTokens.delete(record.accessToken);

  const newAccessToken = `qatk_${crypto.randomBytes(32).toString('hex')}`;
  const newRefreshToken = `qatk_rft_${crypto.randomBytes(32).toString('hex')}`;
  const accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS;
  const refreshExpiresAt = Date.now() + REFRESH_TOKEN_TTL_MS;

  const { user } = record;

  activeTokens.set(newAccessToken, {
    token: newAccessToken,
    user,
    expiresAt: accessExpiresAt,
  });

  refreshTokens.set(newRefreshToken, {
    token: newRefreshToken,
    user,
    accessToken: newAccessToken,
    expiresAt: refreshExpiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user,
    accessExpiresAt,
    refreshExpiresAt,
  };
}

function revokeToken(token) {
  if (token) {
    activeTokens.delete(token);
  }
}

function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  const record = refreshTokens.get(refreshToken);
  if (record) {
    activeTokens.delete(record.accessToken);
    refreshTokens.delete(refreshToken);
  }
}

function updateSessionUser(userId, updatedUser) {
  for (const [t, s] of activeTokens.entries()) {
    if (s.user.id === userId) {
      activeTokens.set(t, { ...s, user: updatedUser });
    }
  }
  for (const [t, r] of refreshTokens.entries()) {
    if (r.user.id === userId) {
      refreshTokens.set(t, { ...r, user: updatedUser });
    }
  }
}

/**
 * Express Authentication Middleware
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);

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
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeRefreshToken,
  updateSessionUser,
  requireAuth,
};
