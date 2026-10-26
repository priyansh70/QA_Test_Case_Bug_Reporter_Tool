const { getCollection } = require('../config/db');

// A job stuck in an in-progress state longer than this (e.g. server crash) may be retried.
const STALE_JOB_MS = 2 * 60 * 1000;

class CapturedBugModel {
  static getCollection() {
    const col = getCollection('captured_bugs');
    if (!col) {
      throw new Error('MongoDB is not connected or captured_bugs collection unavailable.');
    }
    return col;
  }

  /** Inserts a captured bug; returns the existing record if this client bug id was already stored. */
  static async createOnce(record) {
    const col = CapturedBugModel.getCollection();
    try {
      await col.insertOne({ ...record });
      return { bug: record, created: true };
    } catch (err) {
      if (err.code !== 11000) throw err;
      const existing = await CapturedBugModel.findBySessionAndClientId(record.session_id, record.client_bug_id);
      return { bug: existing, created: false };
    }
  }

  static async findBySession(sessionId) {
    return CapturedBugModel.getCollection()
      .find({ session_id: sessionId }, { projection: { _id: 0, recent_events: 0 } })
      .sort({ captured_at: 1 })
      .toArray();
  }

  static async deleteById(id) {
    return CapturedBugModel.getCollection().deleteOne({ id });
  }

  static async deleteBySession(sessionId) {
    return CapturedBugModel.getCollection().deleteMany({ session_id: sessionId });
  }

  static async findBySessionAndClientId(sessionId, clientBugId) {
    return CapturedBugModel.getCollection().findOne(
      { session_id: sessionId, client_bug_id: clientBugId },
      { projection: { _id: 0 } }
    );
  }

  /** Returns { [sessionId]: count } for the given sessions. */
  static async countBySessions(sessionIds) {
    if (sessionIds.length === 0) return {};
    const rows = await CapturedBugModel.getCollection()
      .aggregate([{ $match: { session_id: { $in: sessionIds } } }, { $group: { _id: '$session_id', count: { $sum: 1 } } }])
      .toArray();
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  }

  static async findByIdForUser(id, userId) {
    return CapturedBugModel.getCollection().findOne({ id, user_id: userId }, { projection: { _id: 0 } });
  }

  static async update(id, fields) {
    return CapturedBugModel.getCollection().findOneAndUpdate(
      { id },
      { $set: { ...fields, updated_at: new Date().toISOString() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  }

  /**
   * Atomically moves `statusField` into `inProgress` unless it is already in progress (and not stale)
   * or in one of `blocked` states. Returns the updated bug, or null when the claim was refused.
   */
  static async claim(id, statusField, inProgress, blocked = []) {
    const now = Date.now();
    const staleBefore = new Date(now - STALE_JOB_MS).toISOString();
    return CapturedBugModel.getCollection().findOneAndUpdate(
      {
        id,
        [statusField]: { $nin: blocked },
        $or: [{ [statusField]: { $ne: inProgress } }, { [`${statusField}_started_at`]: { $lt: staleBefore } }],
      },
      { $set: { [statusField]: inProgress, [`${statusField}_started_at`]: new Date(now).toISOString() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  }
}

module.exports = CapturedBugModel;
