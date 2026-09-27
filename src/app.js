import dotenv from 'dotenv';
// Load .env.local first (if present), then fallback to .env
dotenv.config({ path: ['.env.local', '.env'] });

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { initDb, isMongoActive } from './db/index.js';
import authRoutes from './routes/authRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3200;

// Body parsers and cookie handler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend assets
app.use(express.static(path.resolve(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    engine: 'Node.js ' + process.version,
    database: isMongoActive() ? 'MongoDB (Atlas)' : 'SQLite (native)'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function startServer() {
  // Initialize Database (SQLite & MongoDB)
  await initDb();

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🔐 LoginPet Auth & 2FA Server Started!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📊 Active DB: ${isMongoActive() ? 'MongoDB (Atlas)' : 'SQLite (native fallback)'}`);
    if (isMongoActive()) {
      console.log(`👤 MongoDB User: ${process.env.MONGODB_USER || 'shyiski_db_user'}`);
    } else if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('<CLUSTER_HOST>')) {
      console.log(`💡 MongoDB: To connect to Atlas, specify your cluster address in .env.local`);
    }
    console.log(`=========================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
