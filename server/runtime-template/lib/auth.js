// Shared auth helper for generated apps: register/login/requireAuth over a
// `users` table (id, email, password_hash). Usage:
//   const { registerUser, loginUser, requireAuth } = require('./lib/auth');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const SECRET = process.env.APP_JWT_SECRET || "dev-secret-change-me";

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function registerUser(email, password) {
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, hash);
  return { id: info.lastInsertRowid, email };
}

function verifyUser(email, password) {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.id, email: row.email };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: "30d" });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

module.exports = { registerUser, verifyUser, signToken, requireAuth };
