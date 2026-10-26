const crypto = require('crypto');
const TestingSessionModel = require('../models/TestingSession');
const { verifyToken } = require('./authMiddleware');

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function tokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Allows either the session owner (Bearer access token) or the Chrome extension holding the
 * session-scoped connect token (X-Session-Token). The connect token grants access to this one
 * session only and never exposes the user's access token or Azure credentials.
 * Sets req.testingSession and req.sessionActor ('owner' | 'extension').
 */
async function requireSessionAccess(req, res, next) {
  try {
    const session = await TestingSessionModel.findById(req.params.id);

    const authHeader = req.headers.authorization || '';
    const user = authHeader.startsWith('Bearer ') ? verifyToken(authHeader.split(' ')[1]) : null;
    if (user) {
      if (!session || session.user_id !== user.id) {
        return res.status(404).json({ success: false, error: 'Testing session not found.' });
      }
      req.user = user;
      req.testingSession = session;
      req.sessionActor = 'owner';
      return next();
    }

    const sessionToken = req.headers['x-session-token'];
    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
    }
    if (!session || !tokenMatches(sessionToken, session.connect_token_hash)) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid session token.' });
    }
    if (session.token_expires_at && Date.now() > new Date(session.token_expires_at).getTime()) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session token expired. Reconnect from the dashboard.' });
    }

    req.testingSession = session;
    req.sessionActor = 'extension';
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  hashToken,
  requireSessionAccess,
};
