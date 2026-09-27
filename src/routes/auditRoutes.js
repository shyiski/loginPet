import { Router } from 'express';
import { authLogsRepo, db, isMongoActive } from '../db/index.js';
import { UserModel, BackupCodeModel } from '../db/mongo.js';

const router = Router();

/**
 * Get recent auth audit logs
 * GET /api/audit/logs
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const logs = await authLogsRepo.getRecent(limit);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get system stats
 * GET /api/audit/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await authLogsRepo.getStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Raw DB Schema inspection endpoint for backend testing
 * GET /api/audit/schema
 */
router.get('/schema', async (req, res) => {
  try {
    if (isMongoActive()) {
      const users = await UserModel.find().sort({ _id: -1 }).lean();
      const backupCodes = await BackupCodeModel.find().sort({ _id: -1 }).lean();

      return res.json({
        database: 'MongoDB Atlas',
        tables: [
          { name: 'users', type: 'MongoDB Collection' },
          { name: 'backup_codes', type: 'MongoDB Collection' },
          { name: 'auth_logs', type: 'MongoDB Collection' }
        ],
        data: {
          users: users.map(u => ({
            id: u._id.toString(),
            email: u.email,
            username: u.username,
            two_factor_enabled: u.twoFactorEnabled ? 1 : 0,
            secret_status: u.twoFactorSecret ? 'CONFIGURED' : 'NULL',
            created_at: u.createdAt
          })),
          backupCodes: backupCodes.map(b => ({
            id: b._id.toString(),
            user_id: b.userId?.toString(),
            used: b.used ? 1 : 0,
            used_at: b.usedAt,
            created_at: b.createdAt
          }))
        }
      });
    }

    const tables = db.prepare(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const users = db.prepare(`
      SELECT id, email, username, two_factor_enabled, 
             CASE WHEN two_factor_secret IS NOT NULL THEN 'CONFIGURED' ELSE 'NULL' END as secret_status,
             created_at 
      FROM users
      ORDER BY id DESC
    `).all();

    const backupCodes = db.prepare(`
      SELECT id, user_id, used, used_at, created_at
      FROM backup_codes
      ORDER BY id DESC
    `).all();

    res.json({
      database: 'SQLite',
      tables,
      data: {
        users,
        backupCodes
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
