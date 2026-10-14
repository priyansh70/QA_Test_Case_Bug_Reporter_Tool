const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const rawDbName = process.env.MONGO_DB_NAME || 'qa_testcase_generator';
const dbName = rawDbName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'qa_testcase_generator';

let client = null;
let db = null;
let isConnected = false;

/**
 * Connect to MongoDB instance with timeout and fallback support
 */
async function connectMongo() {
  if (client && isConnected) return db;

  try {
    client = new MongoClient(mongoUrl, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log(`🍃 [MongoDB] Connected successfully to "${dbName}" database.`);

    await initMongoIndexes();
    return db;
  } catch (err) {
    isConnected = false;
    db = null;
    client = null;
    console.error(`❌ [MongoDB] Connection failed (${err.message}). Ensure MongoDB is running at ${mongoUrl}.`);
    throw err;
  }
}

/**
 * Ensure database indexes exist for performance & uniqueness
 */
async function initMongoIndexes() {
  if (!db) return;
  try {
    const usersCol = db.collection('users');
    await usersCol.createIndex({ username: 1 }, { unique: true, sparse: true });
    await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCol.createIndex({ id: 1 }, { unique: true });

    const suitesCol = db.collection('test_suites');
    await suitesCol.createIndex({ user_id: 1, created_at: -1 });
    await suitesCol.createIndex({ id: 1 }, { unique: true });

    const bugsCol = db.collection('bugs');
    await bugsCol.createIndex({ user_id: 1, created_at: -1 });
    await bugsCol.createIndex({ id: 1 }, { unique: true });
  } catch (e) {
    console.warn('⚠️ [MongoDB] Index initialization note:', e.message);
  }
}

function getDb() {
  return db;
}

function isMongoConnected() {
  return isConnected;
}

function getCollection(name) {
  if (!db || !isConnected) return null;
  return db.collection(name);
}

module.exports = {
  connectMongo,
  getDb,
  isMongoConnected,
  getCollection,
};
