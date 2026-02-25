const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db/database");
const authenticate = require("../middleware/authenticate");
const { log } = require("../logger");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!EMAIL_RE.test(username)) {
    return res.status(400).json({ error: "Username must be a valid email address" });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const result = stmt.run(username, hash);
    log("USER_CREATED", { id: result.lastInsertRowid, email: username, source: "password" });
    return res.status(201).json({ id: result.lastInsertRowid, username });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "Username already taken" });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!EMAIL_RE.test(username)) {
    return res.status(400).json({ error: "Username must be a valid email address" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !user.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.google_id && !user.password) {
    return res.status(400).json({ error: "This account uses Google Sign-In. Please use the Google button." });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "8h" }
  );

  log("USER_LOGIN", { email: user.username, source: "password" });
  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google token" });
  }

  const googleId = payload.sub;
  const email = payload.email;

  // 1. Already linked to this Google account
  let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);

  if (!user) {
    // 2. Existing account with matching email username — link it
    const byEmail = db.prepare("SELECT * FROM users WHERE username = ?").get(email);
    if (byEmail) {
      db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleId, byEmail.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(byEmail.id);
    }
  }

  if (!user) {
    // 3. Brand-new user — create one
    const role = email === "ceichhorn@gmail.com" ? "admin" : "contributor";
    const result = db
      .prepare("INSERT INTO users (username, password, google_id, role) VALUES (?, ?, ?, ?)")
      .run(email, "", googleId, role);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    log("USER_CREATED", { id: user.id, email, source: "google" });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "8h" }
  );

  log("USER_LOGIN", { email: user.username, source: "google" });
  return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// POST /api/auth/logout
router.post("/logout", authenticate, (req, res) => {
  log("USER_LOGOUT", { email: req.user.username });
  return res.status(204).send();
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => {
  return res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

module.exports = router;
