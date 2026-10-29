const crypto = require('crypto');
const { promisify } = require('util');
const UserModel = require('../models/User');
const {
  createSession,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeRefreshToken,
  updateSessionUser,
  toPublicUser,
} = require('../middlewares/authMiddleware');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // bounds the cost of a single hash

const scrypt = promisify(crypto.scrypt);

// Accounts created before scrypt carry no hash_algo and were hashed with PBKDF2 at 1000 iterations;
// they are verified the old way and upgraded on their next successful login.
async function hashPassword(password, salt, legacy = false) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const derived = legacy
    ? await promisify(crypto.pbkdf2)(password, salt, 1000, 64, 'sha512')
    : await scrypt(password, salt, 64);
  return { hash: derived.toString('hex'), salt };
}

function hashesMatch(a, b) {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username/Email and password are required.' });
      }
      if (typeof username !== 'string' || typeof password !== 'string' || password.length > MAX_PASSWORD_LENGTH) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
      }

      const cleanId = username.trim().toLowerCase();
      const user = await UserModel.findByIdentifier(cleanId);

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
      }

      const legacy = user.hash_algo !== 'scrypt';
      const { hash } = await hashPassword(password, user.salt, legacy);
      if (!hashesMatch(hash, user.hash)) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
      }

      if (legacy) {
        const upgraded = await hashPassword(password);
        await UserModel.updatePassword(user.id, upgraded.hash, upgraded.salt);
      }

      const session = createSession(user);
      return res.json({
        success: true,
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: toPublicUser(session.user),
        expiresAt: session.accessExpiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(401).json({ success: false, error: 'Authentication failed. Please check your credentials.' });
    }
  }

  static async register(req, res) {
    try {
      const { username, email, password, name, azureOrg, azurePat } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email address and password are required for registration.' });
      }
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ success: false, error: 'Email address and password must be text.' });
      }
      if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
        });
      }

      const cleanEmail = (email || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }

      const cleanUsername = (username || cleanEmail || '').trim().toLowerCase();
      const cleanName = (name || '').trim() || cleanUsername || cleanEmail || 'User';
      const cleanOrg = (azureOrg || '').trim() || null;
      const cleanPat = (azurePat || '').trim() || null;

      const existingUser = await UserModel.findByEmailOrUsername(cleanUsername, cleanEmail);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
      }

      const { hash, salt } = await hashPassword(password);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const newUserDoc = await UserModel.create({
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        name: cleanName,
        role: 'user',
        hash,
        salt,
        hash_algo: 'scrypt',
        azure_org: cleanOrg,
        azure_pat: cleanPat,
      });

      const session = createSession(newUserDoc);
      return res.json({
        success: true,
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: toPublicUser(session.user),
        expiresAt: session.accessExpiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ success: false, error: 'Registration failed. Please check your input and try again.' });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: 'Refresh token is required.' });
      }

      const record = await verifyRefreshToken(refreshToken);
      if (!record) {
        return res.status(401).json({ success: false, error: 'Invalid or expired refresh token. Please log in again.' });
      }

      const session = await rotateRefreshToken(refreshToken);
      if (!session) {
        return res.status(401).json({ success: false, error: 'Session refresh failed. Please log in again.' });
      }

      return res.json({
        success: true,
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: toPublicUser(session.user),
        expiresAt: session.accessExpiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(401).json({ success: false, error: 'Session refresh failed. Please log in again.' });
    }
  }

  static async logout(req, res) {
    await revokeToken(req.token);
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  static async getMe(req, res) {
    return res.json({ success: true, user: toPublicUser(req.user) });
  }

  static async updateProfile(req, res) {
    try {
      const { name, email, azureOrg, azurePat } = req.body;
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

      const updatedUserDoc = await UserModel.updateProfile(req.user.id, { name, email, azureOrg, azurePat });

      const safeUser = toPublicUser(updatedUserDoc);

      updateSessionUser(req.user.id, safeUser);
      return res.json({ success: true, user: safeUser });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update profile.' });
    }
  }
}

module.exports = AuthController;
