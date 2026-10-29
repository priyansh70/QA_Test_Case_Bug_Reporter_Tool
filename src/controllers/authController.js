const crypto = require('crypto');
const UserModel = require('../models/User');
const {
  createSession,
  verifyRefreshToken,
  rotateRefreshToken,
  revokeToken,
  revokeRefreshToken,
  updateSessionUser,
} = require('../middlewares/authMiddleware');

function hashPassword(password, salt) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

class AuthController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username/Email and password are required.' });
      }

      const cleanId = (username || '').trim().toLowerCase();
      const user = await UserModel.findByIdentifier(cleanId);

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
      }

      const { hash } = hashPassword(password, user.salt);
      if (hash !== user.hash) {
        return res.status(401).json({ success: false, error: 'Invalid username or password.' });
      }

      const session = createSession(user);
      return res.json({
        success: true,
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
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

      const { hash, salt } = hashPassword(password);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const newUserDoc = await UserModel.create({
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        name: cleanName,
        role: 'user',
        hash,
        salt,
        azure_org: cleanOrg,
        azure_pat: cleanPat,
      });

      const session = createSession(newUserDoc);
      return res.json({
        success: true,
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
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

      const record = verifyRefreshToken(refreshToken);
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
        user: session.user,
        expiresAt: session.accessExpiresAt,
        refreshExpiresAt: session.refreshExpiresAt,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(401).json({ success: false, error: 'Session refresh failed. Please log in again.' });
    }
  }

  static async logout(req, res) {
    revokeToken(req.token);
    const { refreshToken } = req.body;
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  static async getMe(req, res) {
    return res.json({ success: true, user: req.user });
  }

  static async updateProfile(req, res) {
    try {
      const { name, email, azureOrg, azurePat } = req.body;
      const user = await UserModel.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

      const updatedUserDoc = await UserModel.updateProfile(req.user.id, { name, email, azureOrg, azurePat });

      const safeUser = {
        id: updatedUserDoc.id,
        username: updatedUserDoc.username,
        email: updatedUserDoc.email,
        name: updatedUserDoc.name,
        role: updatedUserDoc.role,
        azureOrg: updatedUserDoc.azure_org || updatedUserDoc.azureOrg,
        azurePat: updatedUserDoc.azure_pat || updatedUserDoc.azurePat,
      };

      updateSessionUser(req.user.id, safeUser);
      return res.json({ success: true, user: safeUser });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message || 'Failed to update profile.' });
    }
  }
}

module.exports = AuthController;
