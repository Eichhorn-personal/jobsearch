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

// Dummy hash used to equalize timing when user is not found (prevents username enumeration)
const DUMMY_HASH = bcrypt.hashSync("dummy-timing-equalization", 10);

// If ALLOWED_EMAILS is set, only those addresses may register or sign in
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(",").map(e => e.trim().toLowerCase())
  : null;

function isEmailAllowed(email) {
  return !ALLOWED_EMAILS || ALLOWED_EMAILS.includes(email.toLowerCase());
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (typeof username !== "string" || username.length > 254) {
    return res.status(400).json({ error: "Email must be 254 characters or fewer" });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password must be between 8 and 128 characters" });
  }
  if (!EMAIL_RE.test(username)) {
    return res.status(400).json({ error: "Username must be a valid email address" });
  }
  if (!isEmailAllowed(username)) {
    return res.status(403).json({ error: "Registration is not open for this email address" });
  }

  const hash = await bcrypt.hash(password, 10);
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
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (typeof username !== "string" || username.length > 254) {
    return res.status(400).json({ error: "Email must be 254 characters or fewer" });
  }
  if (typeof password !== "string" || password.length > 128) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  if (!EMAIL_RE.test(username)) {
    return res.status(400).json({ error: "Username must be a valid email address" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !user.password) {
    await bcrypt.compare(password, DUMMY_HASH); // equalize timing to prevent username enumeration
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.google_id && !user.password) {
    return res.status(400).json({ error: "This account uses Google Sign-In. Please use the Google button." });
  }
  if (!await bcrypt.compare(password, user.password)) {
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

  if (!isEmailAllowed(email)) {
    return res.status(403).json({ error: "Registration is not open for this email address" });
  }

  // 1. Already linked to this Google account
  let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(googleId);

  if (!user) {
    // 2. Existing account with matching email username — link it
    const byEmail = db.prepare("SELECT * FROM users WHERE username = ?").get(email);
    if (byEmail) {
      db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(googleId, byEmail.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(byEmail.id);
      log("GOOGLE_ACCOUNT_LINKED", { id: user.id, email });
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
