const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { connectMongo, isMongoConnected, getCollection } = require('./mongo');

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new sqlite3.Database(dbPath);

// Helper wrappers for async/await SQL operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize Database Schemas & Connection
async function initDatabase() {
  await connectMongo();

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await dbRun(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            name TEXT,
            role TEXT DEFAULT 'user',
            hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            azure_org TEXT,
            azure_pat TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await dbRun(`
          CREATE TABLE IF NOT EXISTS test_suites (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            work_item_id TEXT,
            feature_name TEXT,
            data_json TEXT NOT NULL,
            file_name TEXT,
            public_link TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
          )
        `);

        try {
          await dbRun(`ALTER TABLE test_suites ADD COLUMN public_link TEXT`);
        } catch (_) {}

        await dbRun(`
          CREATE TABLE IF NOT EXISTS bugs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            work_item_id TEXT,
            title TEXT NOT NULL,
            severity TEXT,
            description TEXT,
            steps_to_reproduce TEXT,
            expected_result TEXT,
            actual_result TEXT,
            azure_bug_id TEXT,
            assigned_to TEXT,
            media_url TEXT,
            azure_url TEXT,
            public_link TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
          )
        `);

        // Backward compatibility migrations for existing database files
        try {
          await dbRun(`ALTER TABLE bugs ADD COLUMN assigned_to TEXT`);
        } catch (_) {}
        try {
          await dbRun(`ALTER TABLE bugs ADD COLUMN media_url TEXT`);
        } catch (_) {}
        try {
          await dbRun(`ALTER TABLE bugs ADD COLUMN azure_url TEXT`);
        } catch (_) {}
        try {
          await dbRun(`ALTER TABLE bugs ADD COLUMN public_link TEXT`);
        } catch (_) {}

        console.log('⚡ [Database] Storage layer initialized successfully.');
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initDatabase,
  isMongoConnected,
  getCollection,
};
