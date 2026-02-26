const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("./db");

// cost factor 1 keeps tests fast while still exercising the real bcrypt path
function createUser({ username, password = "Password1!", role = "contributor" }) {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 1);
  const result = db
    .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
    .run(username, hash, role);
  return db
    .prepare("SELECT id, username, role FROM users WHERE id = ?")
    .get(result.lastInsertRowid);
}

function tokenFor(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
}

function authHeader(user) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

module.exports = { createUser, tokenFor, authHeader };
