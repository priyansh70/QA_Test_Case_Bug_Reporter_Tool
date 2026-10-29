const { getCollection } = require('../config/db');
const { encryptToken, decryptToken, reencryptIfLegacy } = require('../utils/cryptoUtils');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCI = (s) => new RegExp(`^${escapeRegex(s)}$`, 'i');

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
  static getCollection() {
    const col = getCollection('users');
    if (!col) {
      throw new Error('MongoDB is not connected or users collection unavailable.');
    }
    return col;
  }

  static async findById(id) {
    const col = UserModel.getCollection();
    const user = await col.findOne({ id });
    return formatUserDoc(user);
  }

  static async findByIdentifier(identifier) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const col = UserModel.getCollection();
    const user = await col.findOne({
      $or: [
        { username: exactCI(cleanId) },
        { email: exactCI(cleanId) },
      ],
    });
    return formatUserDoc(user);
  }

  static async findByEmailOrUsername(username, email) {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();
    const col = UserModel.getCollection();

    const query = [];
    if (cleanUsername) query.push({ username: exactCI(cleanUsername) });
    if (cleanEmail) query.push({ email: exactCI(cleanEmail) });
    if (query.length === 0) return null;

    const user = await col.findOne({ $or: query });
    return formatUserDoc(user);
  }

  static async getAll() {
    const col = UserModel.getCollection();
    const users = await col.find({}).toArray();
    return (users || []).map(formatUserDoc);
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
      hash_algo: userDoc.hash_algo || null,
      azure_org: userDoc.azure_org || userDoc.azureOrg || null,
      azure_pat: encryptedPat,
      created_at: userDoc.created_at || now,
      updated_at: userDoc.updated_at || now,
    };

    const col = UserModel.getCollection();
    await col.updateOne({ id: record.id }, { $set: record }, { upsert: true });
    return formatUserDoc(record);
  }

  static async updateProfile(userId, { name, email, azureOrg, azurePat }) {
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOrg = (azureOrg || '').trim() || null;
    const cleanPat = (azurePat || '').trim() || null;
    const now = new Date().toISOString();

    const set = {
      name: cleanName,
      email: cleanEmail || null,
      azure_org: cleanOrg,
      updated_at: now,
    };
    // The PAT is never sent to the browser, so a blank field means "keep the stored one".
    if (cleanPat) set.azure_pat = encryptToken(cleanPat);

    const col = UserModel.getCollection();
    await col.updateOne({ id: userId }, { $set: set });

    return UserModel.findById(userId);
  }

  static async updatePassword(userId, hash, salt) {
    const col = UserModel.getCollection();
    await col.updateOne(
      { id: userId },
      { $set: { hash, salt, hash_algo: 'scrypt', updated_at: new Date().toISOString() } }
    );
  }

  /** Re-encrypt PATs still stored under the legacy default key. */
  static async migrateLegacyPats() {
    const col = UserModel.getCollection();
    const users = await col.find({ azure_pat: /^enc:/ }, { projection: { id: 1, azure_pat: 1 } }).toArray();
    let migrated = 0;
    for (const u of users) {
      const next = reencryptIfLegacy(u.azure_pat);
      if (next) {
        await col.updateOne({ id: u.id }, { $set: { azure_pat: next } });
        migrated += 1;
      }
    }
    return migrated;
  }
}

module.exports = UserModel;
