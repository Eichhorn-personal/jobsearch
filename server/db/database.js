const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "jobsearch.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT,
    google_id  TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date         TEXT,
    role         TEXT,
    company      TEXT,
    source_link  TEXT,
    company_link TEXT,
    resume       INTEGER NOT NULL DEFAULT 0,
    cover_letter INTEGER NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'Applied',
    recruiter    TEXT,
    hiring_mgr   TEXT,
    panel        TEXT,
    hr           TEXT,
    comments     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add google_id column to existing databases
const userCols = db.pragma("table_info(users)").map((c) => c.name);
if (!userCols.includes("google_id")) {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL"
  );
}

module.exports = db;
