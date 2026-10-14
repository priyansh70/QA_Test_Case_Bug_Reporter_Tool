const { getCollection } = require('../config/db');

class TestSuiteModel {
  static getCollection() {
    const col = getCollection('test_suites');
    if (!col) {
      throw new Error('MongoDB is not connected or test_suites collection unavailable.');
    }
    return col;
  }

  static async save({ id, userId, workItemId, featureName, dataJson, fileName, publicLink }) {
    const now = new Date().toISOString();
    const record = {
      id,
      user_id: userId,
      work_item_id: String(workItemId),
      feature_name: featureName,
      data_json: typeof dataJson === 'string' ? dataJson : JSON.stringify(dataJson),
      file_name: fileName,
      public_link: publicLink || null,
      created_at: now,
    };

    const col = TestSuiteModel.getCollection();
    await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
    return record;
  }

  static async findByUser(userId) {
    const col = TestSuiteModel.getCollection();
    return await col.find({ user_id: userId }).sort({ created_at: -1 }).toArray();
  }

  static async findById(id, userId) {
    const col = TestSuiteModel.getCollection();
    return await col.findOne({
      $or: [{ id }, { file_name: id }],
      user_id: userId,
    });
  }

  // Public, unauthenticated lookup used by the shared public link page (no user scoping).
  static async findByIdPublic(id) {
    const col = TestSuiteModel.getCollection();
    return await col.findOne({ id });
  }
}

module.exports = TestSuiteModel;
