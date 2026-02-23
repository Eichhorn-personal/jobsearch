const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "jobsearch.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
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

module.exports = db;
