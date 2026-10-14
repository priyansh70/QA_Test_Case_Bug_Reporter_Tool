const { getCollection } = require('../config/db');
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
        { username: new RegExp(`^${cleanId}$`, 'i') },
        { email: new RegExp(`^${cleanId}$`, 'i') },
      ],
    });
    return formatUserDoc(user);
  }

  static async findByEmailOrUsername(username, email) {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();
    const col = UserModel.getCollection();

    const query = [];
    if (cleanUsername) query.push({ username: new RegExp(`^${cleanUsername}$`, 'i') });
    if (cleanEmail) query.push({ email: new RegExp(`^${cleanEmail}$`, 'i') });
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
    const encryptedPat = cleanPat ? encryptToken(cleanPat) : null;
    const now = new Date().toISOString();

    const col = UserModel.getCollection();
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

    return UserModel.findById(userId);
  }
}

module.exports = UserModel;
