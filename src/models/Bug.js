const { dbRun, dbGet, dbAll, isMongoConnected, getCollection } = require('../config/db');

class BugModel {
  static async save({ id, userId, workItemId, title, severity, description, stepsToReproduce, expectedResult, actualResult, azureBugId }) {
    const now = new Date().toISOString();
    const record = {
      id,
      user_id: userId,
      work_item_id: workItemId || null,
      title,
      severity: severity || '3 - Medium',
      description: description || '',
      steps_to_reproduce: stepsToReproduce || '',
      expected_result: expectedResult || '',
      actual_result: actualResult || '',
      azure_bug_id: azureBugId || null,
      created_at: now,
    };

    if (isMongoConnected()) {
      try {
        const col = getCollection('bugs');
        if (col) {
          await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] Bug save error, falling back to SQLite:', e.message);
      }
    }

    await dbRun(
      `INSERT INTO bugs (id, user_id, work_item_id, title, severity, description, steps_to_reproduce, expected_result, actual_result, azure_bug_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.user_id,
        record.work_item_id,
        record.title,
        record.severity,
        record.description,
        record.steps_to_reproduce,
        record.expected_result,
        record.actual_result,
        record.azure_bug_id,
        record.created_at,
      ]
    );

    return record;
  }

  static async findByUser(userId) {
    if (isMongoConnected()) {
      try {
        const col = getCollection('bugs');
        if (col) {
          const docs = await col.find({ user_id: userId }).sort({ created_at: -1 }).toArray();
          if (docs && docs.length > 0) return docs;
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] Bug findByUser error, falling back to SQLite:', e.message);
      }
    }
    return dbAll(
      `SELECT id, work_item_id, title, severity, description, steps_to_reproduce, expected_result, actual_result, azure_bug_id, created_at FROM bugs WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
  }
}

module.exports = BugModel;
