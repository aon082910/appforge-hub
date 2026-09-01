// Shared SQLite helper for generated apps. Usage: const db = require('./lib/db');
const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data.sqlite");
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");

module.exports = db;
