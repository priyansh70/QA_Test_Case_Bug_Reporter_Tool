// Re-export from config/db.js and models for backwards compatibility
const configDb = require('./config/db');
const UserModel = require('./models/User');
const TestSuiteModel = require('./models/TestSuite');
const BugModel = require('./models/Bug');

module.exports = {
  ...configDb,
  findUserById: UserModel.findById,
  findUserByIdentifier: UserModel.findByIdentifier,
  findUserByEmailOrUsername: UserModel.findByEmailOrUsername,
  getAllUsers: UserModel.getAll,
  createUser: UserModel.create,
  updateUserProfile: UserModel.updateProfile,
  saveTestSuite: TestSuiteModel.save,
  getTestSuitesByUser: TestSuiteModel.findByUser,
  getTestSuiteById: TestSuiteModel.findById,
  saveBug: BugModel.save,
  getBugsByUser: BugModel.findByUser,
};
