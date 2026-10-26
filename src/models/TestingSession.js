const { getCollection } = require('../config/db');

class TestingSessionModel {
  static getCollection() {
    const col = getCollection('testing_sessions');
    if (!col) {
      throw new Error('MongoDB is not connected or testing_sessions collection unavailable.');
    }
    return col;
  }

  static getEventsCollection() {
    const col = getCollection('session_events');
    if (!col) {
      throw new Error('MongoDB is not connected or session_events collection unavailable.');
    }
    return col;
  }

  static async create({ id, userId, websiteUrl, project, iteration, tokenHash, tokenExpiresAt }) {
    const now = new Date().toISOString();
    const record = {
      id,
      user_id: userId,
      website_url: websiteUrl,
      azure_project_id: project.id,
      azure_project_name: project.name,
      azure_iteration_id: iteration.id,
      azure_iteration_name: iteration.name,
      azure_iteration_path: iteration.path,
      status: 'created', // created | recording | stopped | failed
      connect_token_hash: tokenHash,
      token_expires_at: tokenExpiresAt,
      event_count: 0,
      last_seq: 0,
      created_at: now,
      started_at: null,
      ended_at: null,
      last_seen_at: null,
      updated_at: now,
    };
    await TestingSessionModel.getCollection().insertOne({ ...record });
    return record;
  }

  static async findById(id) {
    return TestingSessionModel.getCollection().findOne({ id });
  }

  static async findByIdForUser(id, userId) {
    return TestingSessionModel.getCollection().findOne({ id, user_id: userId });
  }

  static async findByUser(userId) {
    return TestingSessionModel.getCollection()
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
  }

  /** Removes the session and its recorded events. */
  static async deleteById(id) {
    await TestingSessionModel.getEventsCollection().deleteMany({ session_id: id });
    return TestingSessionModel.getCollection().deleteOne({ id });
  }

  static async rotateToken(id, tokenHash, tokenExpiresAt) {
    return TestingSessionModel.getCollection().findOneAndUpdate(
      { id, status: { $in: ['created', 'recording'] } },
      { $set: { connect_token_hash: tokenHash, token_expires_at: tokenExpiresAt, updated_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
  }

  /** Records an extension heartbeat; the first one moves the session created -> recording. */
  static async markConnected(id) {
    const now = new Date().toISOString();
    const col = TestingSessionModel.getCollection();
    await col.updateOne({ id, status: 'created' }, { $set: { status: 'recording', started_at: now } });
    return col.findOneAndUpdate(
      { id, status: 'recording' },
      { $set: { last_seen_at: now, updated_at: now } },
      { returnDocument: 'after' }
    );
  }

  static async stop(id) {
    const now = new Date().toISOString();
    return TestingSessionModel.getCollection().findOneAndUpdate(
      { id, status: { $in: ['created', 'recording'] } },
      { $set: { status: 'stopped', ended_at: now, updated_at: now } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Persists a batch of sanitized events. Duplicate (session_id, seq) pairs from retried
   * batches are rejected by the unique index and ignored, so retries are idempotent.
   */
  static async insertEvents(sessionId, events) {
    if (events.length === 0) return { inserted: 0 };
    const receivedAt = new Date().toISOString();
    const docs = events.map((e) => ({ ...e, session_id: sessionId, received_at: receivedAt }));

    let inserted;
    try {
      const result = await TestingSessionModel.getEventsCollection().insertMany(docs, { ordered: false });
      inserted = result.insertedCount;
    } catch (err) {
      const writeErrors = err.writeErrors ? [].concat(err.writeErrors) : [];
      const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((w) => w.code === 11000);
      if (!onlyDuplicates) throw err;
      inserted = docs.length - writeErrors.length;
    }

    const maxSeq = Math.max(...events.map((e) => e.seq));
    await TestingSessionModel.getCollection().updateOne(
      { id: sessionId },
      { $inc: { event_count: inserted }, $max: { last_seq: maxSeq }, $set: { last_seen_at: receivedAt, updated_at: receivedAt } }
    );
    return { inserted };
  }

  static async findEvents(sessionId, { afterSeq = 0, limit = 500 } = {}) {
    return TestingSessionModel.getEventsCollection()
      .find({ session_id: sessionId, seq: { $gt: afterSeq } }, { projection: { _id: 0, session_id: 0 } })
      .sort({ seq: 1 })
      .limit(limit)
      .toArray();
  }

  /** Most recent events up to (and including) a point in time, returned oldest-first. */
  static async findRecentEvents(sessionId, beforeIso, limit = 20) {
    const rows = await TestingSessionModel.getEventsCollection()
      .find({ session_id: sessionId, ts: { $lte: beforeIso } }, { projection: { _id: 0, session_id: 0, received_at: 0 } })
      .sort({ seq: -1 })
      .limit(limit)
      .toArray();
    return rows.reverse();
  }
}

module.exports = TestingSessionModel;
