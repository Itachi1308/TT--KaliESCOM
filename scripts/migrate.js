const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_PATH = path.join(__dirname, '..', 'database', 'escom_eventos.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

(async () => {
  const db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const name = file;
    const exists = await db.get('SELECT 1 FROM migrations WHERE name = ?', [name]);
    if (exists) {
      console.log(`Skipping ${name} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`Applying migration: ${name}`);
    try {
      await db.exec('BEGIN');
      await db.exec(sql);
      await db.run('INSERT INTO migrations (name) VALUES (?)', [name]);
      await db.exec('COMMIT');
      console.log(`Applied ${name}`);
    } catch (err) {
      console.error(`Failed to apply ${name}:`, err.message);
      await db.exec('ROLLBACK');
      process.exit(1);
    }
  }

  console.log('Migrations complete.');
  process.exit(0);
})();
