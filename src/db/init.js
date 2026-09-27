import { initDb } from './index.js';

console.log('[DB] Running database migration and setup...');
initDb();
console.log('[DB] Migration complete.');
