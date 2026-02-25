const jwt = require("jsonwebtoken");
const db = require("../db/database");

module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    // Re-fetch role from DB so role changes take effect immediately without waiting for token expiry
    const user = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(payload.sub);
    if (!user) return res.status(401).json({ error: "Token expired or invalid" });
    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Token expired or invalid" });
  }
};
