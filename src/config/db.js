const { connectMongo, isMongoConnected, getCollection, getDb } = require('./mongo');

/**
 * Initialize MongoDB connection and indexes
 */
async function initDatabase() {
  const db = await connectMongo();
  console.log('⚡ [Database] MongoDB storage layer initialized successfully.');
  return db;
}

module.exports = {
  initDatabase,
  isMongoConnected,
  getCollection,
  getDb,
};
