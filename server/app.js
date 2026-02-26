const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const dropdownRoutes = require("./routes/dropdowns");
const logRoutes = require("./routes/logs");
const userRoutes = require("./routes/users");

const app = express();

app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "16kb" }));

if (process.env.NODE_ENV !== "test") {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again later" },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/dropdowns", dropdownRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/users", userRoutes);

app.use((err, _req, res, _next) => {
  console.error(`[${new Date().toISOString()}] UNHANDLED_ERROR message="${err.message}"\n${err.stack}`);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
