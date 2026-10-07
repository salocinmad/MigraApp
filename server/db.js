/* =====================================================
   MigraApp — server/db.js
   Conexión SQLite, schema y seed del usuario admin
   ===================================================== */
'use strict';

const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/migraapp.db');

let _db = null;

function getDb() {
  if (_db) return _db;

  _db = new Database(DB_PATH, { verbose: process.env.NODE_ENV !== 'production' ? console.log : null });

  // Configuración de rendimiento y seguridad
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  initSchema();
  seedAdmin();

  return _db;
}

function initSchema() {
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
      display_name  TEXT,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'patient'
                       CHECK(role IN ('admin', 'patient')),
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS migraines (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT NOT NULL
                            REFERENCES users(id) ON DELETE CASCADE,
      date                TEXT NOT NULL,
      from_previous       INTEGER NOT NULL DEFAULT 0
                            CHECK(from_previous IN (0, 1)),
      episode_start_date  TEXT,
      duration            INTEGER NOT NULL DEFAULT 1,
      intensity           INTEGER NOT NULL DEFAULT 5
                            CHECK(intensity BETWEEN 1 AND 10),
      neuralgia           INTEGER NOT NULL DEFAULT 0
                            CHECK(neuralgia IN (0, 1)),
      photosensitivity    INTEGER NOT NULL DEFAULT 0
                            CHECK(photosensitivity IN (0, 1)),
      trigger             TEXT NOT NULL DEFAULT '',
      medication          TEXT NOT NULL DEFAULT '',
      notes               TEXT NOT NULL DEFAULT '',
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT,
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_migraines_user_date
      ON migraines(user_id, date);

    CREATE TABLE IF NOT EXISTS sessions (
      sid     TEXT PRIMARY KEY,
      sess    TEXT NOT NULL,
      expired INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expired
      ON sessions(expired);
  `);

  const cols = _db.prepare("PRAGMA table_info(migraines)").all();
  if (cols.length > 0 && !cols.some(c => c.name === 'trigger')) {
    _db.exec("ALTER TABLE migraines ADD COLUMN trigger TEXT NOT NULL DEFAULT ''");
  }
}



function seedAdmin() {
  const exists = _db.prepare("SELECT id FROM users WHERE id = 'admin'").get();
  if (!exists) {
    const hash = bcrypt.hashSync('MigraApp-admin', 10);
    _db.prepare(`
      INSERT INTO users (id, username, display_name, password_hash, role)
      VALUES ('admin', 'admin', 'Administrador', ?, 'admin')
    `).run(hash);
    console.log('[DB] ✅ Usuario admin "admin" creado con contraseña: MigraApp-admin');
  }
}

module.exports = { getDb };
