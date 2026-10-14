const { getCollection } = require('../config/db');

class BugModel {
  static getCollection() {
    const col = getCollection('bugs');
    if (!col) {
      throw new Error('MongoDB is not connected or bugs collection unavailable.');
    }
    return col;
  }

  static async save({
    id,
    userId,
    workItemId,
    title,
    severity,
    description,
    stepsToReproduce,
    expectedResult,
    actualResult,
    azureBugId,
    assignedTo,
    mediaUrl,
    azureUrl,
    publicLink,
  }) {
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
      assigned_to: assignedTo || null,
      media_url: mediaUrl || null,
      azure_url: azureUrl || null,
      public_link: publicLink || null,
      created_at: now,
    };

    const col = BugModel.getCollection();
    await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
    return record;
  }

  static async findByUser(userId) {
    const col = BugModel.getCollection();
    return await col.find({ user_id: userId }).sort({ created_at: -1 }).toArray();
  }

  static async findById(id) {
    const col = BugModel.getCollection();
    return await col.findOne({ id });
  }
}

module.exports = BugModel;
