const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Initialize tables
async function initDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS cafes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL NOT NULL,
      category TEXT DEFAULT 'General',
      original_image TEXT NOT NULL,
      processed_image TEXT DEFAULT '',
      is_processing INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
    );
  `);
}

// Helper: get one row
async function dbGet(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper: get all rows
async function dbAll(sql, args = []) {
  const result = await db.execute({ sql, args });
  return result.rows;
}

// Helper: run a write query, returns { lastInsertRowid, changes }
async function dbRun(sql, args = []) {
  const result = await db.execute({ sql, args });
  return {
    lastInsertRowid: Number(result.lastInsertRowid),
    changes: result.rowsAffected,
  };
}

module.exports = { db, initDatabase, dbGet, dbAll, dbRun };
