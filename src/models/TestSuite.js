const { dbRun, dbGet, dbAll, isMongoConnected, getCollection } = require('../config/db');

class TestSuiteModel {
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

    if (isMongoConnected()) {
      try {
        const col = getCollection('test_suites');
        if (col) {
          await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] TestSuite save error, falling back to SQLite:', e.message);
      }
    }

    await dbRun(
      `INSERT INTO test_suites (id, user_id, work_item_id, feature_name, data_json, file_name, public_link, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.user_id, record.work_item_id, record.feature_name, record.data_json, record.file_name, record.public_link, record.created_at]
    );

    return record;
  }

  static async findByUser(userId) {
    if (isMongoConnected()) {
      try {
        const col = getCollection('test_suites');
        if (col) {
          const docs = await col.find({ user_id: userId }).sort({ created_at: -1 }).toArray();
          if (docs && docs.length > 0) return docs;
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] TestSuite findByUser error, falling back to SQLite:', e.message);
      }
    }
    return dbAll(
      `SELECT id, work_item_id, feature_name, data_json, file_name, public_link, created_at FROM test_suites WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
  }

  static async findById(id, userId) {
    if (isMongoConnected()) {
      try {
        const col = getCollection('test_suites');
        if (col) {
          const doc = await col.findOne({
            $or: [{ id }, { file_name: id }],
            user_id: userId,
          });
          if (doc) return doc;
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] TestSuite findById error, falling back to SQLite:', e.message);
      }
    }
    return dbGet(
      `SELECT * FROM test_suites WHERE (id = ? OR file_name = ?) AND user_id = ?`,
      [id, id, userId]
    );
  }

  // Public, unauthenticated lookup used by the shared public link page (no user scoping).
  static async findByIdPublic(id) {
    if (isMongoConnected()) {
      try {
        const col = getCollection('test_suites');
        if (col) {
          const doc = await col.findOne({ id });
          if (doc) return doc;
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] TestSuite findByIdPublic error, falling back to SQLite:', e.message);
      }
    }
    return dbGet(`SELECT * FROM test_suites WHERE id = ?`, [id]);
  }
}

module.exports = TestSuiteModel;
