import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, default: '', trim: true },
  passwordHash: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },
  gender: { type: String, enum: ['M', 'F', null], default: null },
  profileCompleted: { type: Boolean, default: false },
  avatarUrl: { type: String, default: null }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

// Backup Codes Schema
const backupCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codeHash: { type: String, required: true },
  used: { type: Boolean, default: false },
  usedAt: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

export const BackupCodeModel = mongoose.models.BackupCode || mongoose.model('BackupCode', backupCodeSchema);

// Auth Logs Schema
const authLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  action: { type: String, required: true, index: true },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  details: { type: String, default: null }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

export const AuthLogModel = mongoose.models.AuthLog || mongoose.model('AuthLog', authLogSchema);

let isConnected = false;

export async function connectMongo(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  if (uri.includes('<CLUSTER_HOST>') || uri.includes('<cluster-address>') || uri.includes('<')) {
    console.warn('[MongoDB] ⚠️ MONGODB_URI contains a cluster host placeholder. Specify the real cluster address in .env.local');
    return false;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log('[MongoDB] ✅ Successfully connected to MongoDB Atlas!');
    return true;
  } catch (err) {
    console.error('[MongoDB] ❌ Connection error to MongoDB Atlas:', err.message);
    isConnected = false;
    return false;
  }
}

export function isMongoActive() {
  return isConnected && mongoose.connection.readyState === 1;
}

// Helpers to format MongoDB documents to match existing application contracts
export function formatUser(doc) {
  if (!doc) return null;
  const idStr = doc._id ? doc._id.toString() : String(doc.id);
  return {
    id: idStr,
    _id: idStr,
    email: doc.email,
    username: doc.username || doc.email.split('@')[0],
    gender: doc.gender || null,
    profile_completed: Boolean(doc.profileCompleted),
    profileCompleted: Boolean(doc.profileCompleted),
    two_factor_enabled: doc.twoFactorEnabled ? 1 : 0,
    avatar_url: doc.avatarUrl || null,
    avatarUrl: doc.avatarUrl || null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  };
}

export function formatUserWithSecret(doc) {
  if (!doc) return null;
  return {
    ...formatUser(doc),
    password_hash: doc.passwordHash,
    two_factor_secret: doc.twoFactorSecret
  };
}

export function formatBackupCode(doc) {
  if (!doc) return null;
  const idStr = doc._id ? doc._id.toString() : String(doc.id);
  return {
    id: idStr,
    _id: idStr,
    user_id: doc.userId ? (doc.userId._id ? doc.userId._id.toString() : doc.userId.toString()) : null,
    code_hash: doc.codeHash,
    used: doc.used ? 1 : 0,
    used_at: doc.usedAt,
    created_at: doc.createdAt
  };
}

// MongoDB Repository Implementations
export const userRepoMongo = {
  async create({ email, username, passwordHash, gender = null, avatarUrl = null }) {
    const doc = await UserModel.create({
      email: email.toLowerCase(),
      username: username || email.split('@')[0],
      passwordHash,
      twoFactorEnabled: false,
      gender: gender || null,
      profileCompleted: false,
      avatarUrl: avatarUrl || null
    });
    return formatUser(doc);
  },

  async getAllUsers() {
    try {
      const docs = await UserModel.find().sort({ createdAt: -1 }).lean();
      return docs.map(formatUser);
    } catch {
      return [];
    }
  },

  async findByEmail(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    return formatUserWithSecret(doc);
  },

  async findByEmailOrUsername(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const doc = await UserModel.findOne({
      $or: [
        { email: clean },
        { username: { $regex: new RegExp(`^${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    }).lean();
    return formatUserWithSecret(doc);
  },

  async findById(id) {
    try {
      const doc = await UserModel.findById(id).lean();
      return formatUser(doc);
    } catch {
      return null;
    }
  },

  async findByIdWithSecret(id) {
    try {
      const doc = await UserModel.findById(id).lean();
      return formatUserWithSecret(doc);
    } catch {
      return null;
    }
  },

  async updateProfile(userId, { username, gender, avatarUrl }) {
    const updateData = {
      updatedAt: new Date(),
      profileCompleted: true
    };
    if (username && username.trim()) updateData.username = username.trim();
    if (gender) updateData.gender = gender;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const doc = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { returnDocument: 'after' }
    ).lean();
    return formatUser(doc);
  },

  async findOrCreateGoogleUser({ email, name, googleId, avatarUrl }) {
    let user = await UserModel.findOne({ email: email.toLowerCase() });
    const defaultAvatar = avatarUrl || `https://lh3.googleusercontent.com/a/default-user=s96-c`;
    if (!user) {
      user = await UserModel.create({
        email: email.toLowerCase(),
        username: name || email.split('@')[0],
        passwordHash: 'GOOGLE_OAUTH_' + Math.random().toString(36),
        twoFactorEnabled: false,
        profileCompleted: false,
        avatarUrl: defaultAvatar
      });
      return { user: formatUser(user), isNew: true };
    }
    if (avatarUrl && !user.avatarUrl) {
      user.avatarUrl = avatarUrl;
      await user.save();
    }
    return { user: formatUser(user), isNew: false };
  },

  async saveTemp2FASecret(userId, secret) {
    return await UserModel.findByIdAndUpdate(userId, {
      twoFactorSecret: secret,
      updatedAt: new Date()
    });
  },

  async enable2FA(userId) {
    return await UserModel.findByIdAndUpdate(userId, {
      twoFactorEnabled: true,
      updatedAt: new Date()
    });
  },

  async disable2FA(userId) {
    return await UserModel.findByIdAndUpdate(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date()
    });
  }
};

export const backupCodesRepoMongo = {
  async replaceCodes(userId, hashedCodes) {
    await BackupCodeModel.deleteMany({ userId });
    if (hashedCodes && hashedCodes.length > 0) {
      const docs = hashedCodes.map(codeHash => ({
        userId,
        codeHash,
        used: false
      }));
      await BackupCodeModel.insertMany(docs);
    }
  },

  async getUnusedCodes(userId) {
    try {
      const codes = await BackupCodeModel.find({ userId, used: false }).lean();
      return codes.map(formatBackupCode);
    } catch {
      return [];
    }
  },

  async markAsUsed(id) {
    return await BackupCodeModel.findByIdAndUpdate(id, {
      used: true,
      usedAt: new Date()
    });
  }
};

export const authLogsRepoMongo = {
  async create({ userId = null, action, ip = null, userAgent = null, details = null }) {
    try {
      return await AuthLogModel.create({
        userId: userId || null,
        action,
        ipAddress: ip,
        userAgent,
        details
      });
    } catch (err) {
      console.error('[MongoDB AuthLogs] Error creating log:', err.message);
    }
  },

  async getRecent(limit = 50) {
    try {
      const docs = await AuthLogModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'email')
        .lean();

      return docs.map(doc => ({
        id: doc._id.toString(),
        _id: doc._id.toString(),
        user_id: doc.userId?._id ? doc.userId._id.toString() : (doc.userId ? doc.userId.toString() : null),
        user_email: doc.userId?.email || null,
        action: doc.action,
        ip_address: doc.ipAddress,
        user_agent: doc.userAgent,
        details: doc.details,
        created_at: doc.createdAt
      }));
    } catch {
      return [];
    }
  },

  async getStats() {
    try {
      const [totalUsers, usersWith2FA, totalLogs, recentFailures] = await Promise.all([
        UserModel.countDocuments(),
        UserModel.countDocuments({ twoFactorEnabled: true }),
        AuthLogModel.countDocuments(),
        AuthLogModel.countDocuments({ action: { $in: ['LOGIN_FAILED', '2FA_FAILED'] } })
      ]);
      return { totalUsers, usersWith2FA, totalLogs, recentFailures };
    } catch {
      return { totalUsers: 0, usersWith2FA: 0, totalLogs: 0, recentFailures: 0 };
    }
  }
};
