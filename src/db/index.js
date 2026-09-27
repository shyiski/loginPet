import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  connectMongo,
  isMongoActive,
  userRepoMongo,
  backupCodesRepoMongo,
  authLogsRepoMongo,
  UserModel,
  BackupCodeModel,
  AuthLogModel
} from './mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_FILE || path.resolve(__dirname, '../../data/database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for high concurrency and relational integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export async function initDb() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Safe migrations for SQLite
  try {
    db.exec('ALTER TABLE users ADD COLUMN gender TEXT DEFAULT NULL;');
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN profile_completed INTEGER NOT NULL DEFAULT 0;');
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL;');
  } catch {}

  console.log(`[DB] SQLite schema verified at: ${dbPath}`);

  if (process.env.MONGODB_URI) {
    await connectMongo(process.env.MONGODB_URI);
  }
}

export { isMongoActive };

// Unified User DAO (MongoDB / SQLite)
export const userRepo = {
  async create({ email, username, passwordHash, gender = null }) {
    if (isMongoActive()) {
      return await userRepoMongo.create({ email, username, passwordHash, gender });
    }
    const finalUsername = username || email.split('@')[0];
    const stmt = db.prepare(`
      INSERT INTO users (email, username, password_hash, gender)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(email.toLowerCase(), finalUsername, passwordHash, gender);
    return this.findById(Number(result.lastInsertRowid));
  },

  async getAllUsers() {
    if (isMongoActive()) {
      return await userRepoMongo.getAllUsers();
    }
    const stmt = db.prepare(`
      SELECT id, email, username, gender, profile_completed, two_factor_enabled, avatar_url, created_at, updated_at
      FROM users
      ORDER BY id DESC
    `);
    return stmt.all();
  },

  async findByEmail(email) {
    if (isMongoActive()) {
      return await userRepoMongo.findByEmail(email);
    }
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email.toLowerCase());
  },

  async findByEmailOrUsername(identifier) {
    if (!identifier) return null;
    if (isMongoActive()) {
      return await userRepoMongo.findByEmailOrUsername(identifier);
    }
    const clean = identifier.trim().toLowerCase();
    const stmt = db.prepare('SELECT * FROM users WHERE lower(email) = ? OR lower(username) = ?');
    return stmt.get(clean, clean);
  },

  async findById(id) {
    if (isMongoActive()) {
      return await userRepoMongo.findById(id);
    }
    const stmt = db.prepare(`
      SELECT id, email, username, gender, profile_completed, two_factor_enabled, created_at, updated_at
      FROM users WHERE id = ?
    `);
    return stmt.get(id);
  },

  async findByIdWithSecret(id) {
    if (isMongoActive()) {
      return await userRepoMongo.findByIdWithSecret(id);
    }
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  async updateProfile(userId, { username, gender, avatarUrl }) {
    if (isMongoActive()) {
      return await userRepoMongo.updateProfile(userId, { username, gender, avatarUrl });
    }
    const stmt = db.prepare(`
      UPDATE users
      SET username = COALESCE(?, username),
          gender = COALESCE(?, gender),
          avatar_url = COALESCE(?, avatar_url),
          profile_completed = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(username || null, gender || null, avatarUrl || null, userId);
    return this.findById(userId);
  },

  async findOrCreateGoogleUser({ email, name, googleId, avatarUrl }) {
    if (isMongoActive()) {
      return await userRepoMongo.findOrCreateGoogleUser({ email, name, googleId, avatarUrl });
    }
    let user = await this.findByEmail(email);
    if (!user) {
      user = await this.create({
        email,
        username: name || email.split('@')[0],
        passwordHash: 'GOOGLE_OAUTH_' + Math.random().toString(36),
        avatarUrl: avatarUrl || `https://lh3.googleusercontent.com/a/default-user=s96-c`
      });
      return { user, isNew: true };
    }
    return { user, isNew: false };
  },

  async saveTemp2FASecret(userId, secret) {
    if (isMongoActive()) {
      return await userRepoMongo.saveTemp2FASecret(userId, secret);
    }
    const stmt = db.prepare(`
      UPDATE users
      SET two_factor_secret = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(secret, userId);
  },

  async enable2FA(userId) {
    if (isMongoActive()) {
      return await userRepoMongo.enable2FA(userId);
    }
    const stmt = db.prepare(`
      UPDATE users
      SET two_factor_enabled = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(userId);
  },

  async disable2FA(userId) {
    if (isMongoActive()) {
      return await userRepoMongo.disable2FA(userId);
    }
    const stmt = db.prepare(`
      UPDATE users
      SET two_factor_enabled = 0, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(userId);
  }
};

// Unified Backup Codes DAO
export const backupCodesRepo = {
  async replaceCodes(userId, hashedCodes) {
    if (isMongoActive()) {
      return await backupCodesRepoMongo.replaceCodes(userId, hashedCodes);
    }
    const delStmt = db.prepare('DELETE FROM backup_codes WHERE user_id = ?');
    delStmt.run(userId);

    const insertStmt = db.prepare(`
      INSERT INTO backup_codes (user_id, code_hash)
      VALUES (?, ?)
    `);

    for (const codeHash of hashedCodes) {
      insertStmt.run(userId, codeHash);
    }
  },

  async getUnusedCodes(userId) {
    if (isMongoActive()) {
      return await backupCodesRepoMongo.getUnusedCodes(userId);
    }
    const stmt = db.prepare(`
      SELECT id, code_hash, created_at
      FROM backup_codes
      WHERE user_id = ? AND used = 0
    `);
    return stmt.all(userId);
  },

  async markAsUsed(id) {
    if (isMongoActive()) {
      return await backupCodesRepoMongo.markAsUsed(id);
    }
    const stmt = db.prepare(`
      UPDATE backup_codes
      SET used = 1, used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(id);
  }
};

// Unified Auth / Audit Logs DAO
export const authLogsRepo = {
  async create({ userId = null, action, ip = null, userAgent = null, details = null }) {
    if (isMongoActive()) {
      return await authLogsRepoMongo.create({ userId, action, ip, userAgent, details });
    }
    const stmt = db.prepare(`
      INSERT INTO auth_logs (user_id, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(userId, action, ip, userAgent, details);
  },

  async getRecent(limit = 50) {
    if (isMongoActive()) {
      return await authLogsRepoMongo.getRecent(limit);
    }
    const stmt = db.prepare(`
      SELECT l.id, l.user_id, u.email as user_email, l.action, l.ip_address, l.user_agent, l.details, l.created_at
      FROM auth_logs l
      LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.id DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  async getStats() {
    if (isMongoActive()) {
      return await authLogsRepoMongo.getStats();
    }
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get()?.count || 0;
    const usersWith2FA = db.prepare('SELECT COUNT(*) as count FROM users WHERE two_factor_enabled = 1').get()?.count || 0;
    const totalLogs = db.prepare('SELECT COUNT(*) as count FROM auth_logs').get()?.count || 0;
    const recentFailures = db.prepare(`
      SELECT COUNT(*) as count FROM auth_logs 
      WHERE action IN ('LOGIN_FAILED', '2FA_FAILED')
    `).get()?.count || 0;

    return { totalUsers, usersWith2FA, totalLogs, recentFailures };
  }
};
