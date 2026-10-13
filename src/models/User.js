const { dbRun, dbGet, dbAll, isMongoConnected, getCollection } = require('../config/db');
const { encryptToken, decryptToken } = require('../utils/cryptoUtils');

function formatUserDoc(userDoc) {
  if (!userDoc) return null;
  const rawPat = userDoc.azure_pat || userDoc.azurePat || null;
  const decryptedPat = decryptToken(rawPat);
  const org = userDoc.azure_org || userDoc.azureOrg || null;

  return {
    ...userDoc,
    azure_org: org,
    azureOrg: org,
    azure_pat: decryptedPat,
    azurePat: decryptedPat,
  };
}

class UserModel {
  static async findById(id) {
    if (isMongoConnected()) {
      try {
        const col = getCollection('users');
        if (col) {
          const user = await col.findOne({ id });
          if (user) return formatUserDoc(user);
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] findById error, falling back to SQLite:', e.message);
      }
    }
    const row = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    return formatUserDoc(row);
  }

  static async findByIdentifier(identifier) {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (isMongoConnected()) {
      try {
        const col = getCollection('users');
        if (col) {
          const user = await col.findOne({
            $or: [
              { username: new RegExp(`^${cleanId}$`, 'i') },
              { email: new RegExp(`^${cleanId}$`, 'i') },
            ],
          });
          if (user) return formatUserDoc(user);
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] findByIdentifier error, falling back to SQLite:', e.message);
      }
    }
    const row = await dbGet(
      'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?',
      [cleanId, cleanId]
    );
    return formatUserDoc(row);
  }

  static async findByEmailOrUsername(username, email) {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (isMongoConnected()) {
      try {
        const col = getCollection('users');
        if (col) {
          const query = [];
          if (cleanUsername) query.push({ username: new RegExp(`^${cleanUsername}$`, 'i') });
          if (cleanEmail) query.push({ email: new RegExp(`^${cleanEmail}$`, 'i') });
          if (query.length > 0) {
            const user = await col.findOne({ $or: query });
            if (user) return formatUserDoc(user);
          }
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] findByEmailOrUsername error, falling back to SQLite:', e.message);
      }
    }

    let row = null;
    if (cleanEmail && cleanUsername) {
      row = await dbGet(
        'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?',
        [cleanUsername, cleanEmail]
      );
    } else if (cleanUsername) {
      row = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    } else if (cleanEmail) {
      row = await dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    }
    return formatUserDoc(row);
  }

  static async getAll() {
    if (isMongoConnected()) {
      try {
        const col = getCollection('users');
        if (col) {
          const users = await col.find({}).toArray();
          if (users && users.length > 0) return users.map(formatUserDoc);
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] getAll error, falling back to SQLite:', e.message);
      }
    }
    const rows = await dbAll('SELECT * FROM users');
    return (rows || []).map(formatUserDoc);
  }

  static async create(userDoc) {
    const now = new Date().toISOString();
    const plainPat = (userDoc.azure_pat || userDoc.azurePat || '').trim() || null;
    const encryptedPat = plainPat ? encryptToken(plainPat) : null;

    const record = {
      id: userDoc.id,
      username: userDoc.username,
      email: userDoc.email || null,
      name: userDoc.name || null,
      role: userDoc.role || 'user',
      hash: userDoc.hash,
      salt: userDoc.salt,
      azure_org: userDoc.azure_org || userDoc.azureOrg || null,
      azure_pat: encryptedPat,
      created_at: userDoc.created_at || now,
      updated_at: userDoc.updated_at || now,
    };

    if (isMongoConnected()) {
      try {
        const col = getCollection('users');
        if (col) {
          await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] create user error, falling back to SQLite:', e.message);
      }
    }

    await dbRun(
      `INSERT OR REPLACE INTO users (id, username, email, name, role, hash, salt, azure_org, azure_pat, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.username,
        record.email,
        record.name,
        record.role,
        record.hash,
        record.salt,
        record.azure_org,
        record.azure_pat,
        record.created_at,
        record.updated_at,
      ]
    );

    return formatUserDoc(record);
  }

  static async updateProfile(userId, { name, email, azureOrg, azurePat }) {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOrg = (azureOrg || '').trim() || null;
    const cleanPat = (azurePat || '').trim() || null;
    const encryptedPat = cleanPat ? encryptToken(cleanPat) : null;
    const now = new Date().toISOString();

    if (isMongoConnected()) {
      try {
        const col = getCollection('users');
        if (col) {
          await col.updateOne(
            { id: userId },
            {
              $set: {
                name: cleanName,
                email: cleanEmail || null,
                azure_org: cleanOrg,
                azure_pat: encryptedPat,
                updated_at: now,
              },
            }
          );
        }
      } catch (e) {
        console.warn('⚠️ [MongoDB] updateProfile error, falling back to SQLite:', e.message);
      }
    }

    await dbRun(
      `UPDATE users SET name = ?, email = ?, azure_org = ?, azure_pat = ?, updated_at = ? WHERE id = ?`,
      [cleanName, cleanEmail || null, cleanOrg, encryptedPat, now, userId]
    );

    return UserModel.findById(userId);
  }
}

module.exports = UserModel;
