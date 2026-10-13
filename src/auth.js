// Re-export auth routines from controllers & middlewares for backwards compatibility
const AuthController = require('./controllers/authController');
const { verifyToken, revokeToken } = require('./middlewares/authMiddleware');

module.exports = {
  registerUser: async (data) => {
    // Adapter mock for legacy callers
    const req = { body: data };
    let result = {};
    const res = {
      json: (d) => { result = d; return res; },
      status: () => res,
    };
    await AuthController.register(req, res);
    return result;
  },
  authenticateUser: async (identifier, password) => {
    const req = { body: { username: identifier, password } };
    let result = {};
    const res = {
      json: (d) => { result = d; return res; },
      status: (code) => { if (code >= 400) throw new Error(result.error || 'Authentication failed.'); return res; },
    };
    await AuthController.login(req, res);
    return result;
  },
  updateUserProfile: AuthController.updateProfile,
  verifyToken,
  revokeToken,
};
