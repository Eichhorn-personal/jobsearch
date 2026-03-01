#!/usr/bin/env node
/**
 * scripts/run-tests.js
 *
 * Runs all three test suites sequentially and writes every line of output
 * to a timestamped log file in test-results/.
 *
 * Usage:  npm run test:all
 */

const { spawn } = require("child_process");
const fs   = require("fs");
const path = require("path");

// ── Paths ──────────────────────────────────────────────────────────────────
const ROOT     = path.join(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "test-results");

// ── Timestamp  ─────────────────────────────────────────────────────────────
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const timestamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
  `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

// ── Log file ───────────────────────────────────────────────────────────────
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const logPath   = path.join(LOGS_DIR, `${timestamp}.log`);
const logStream = fs.createWriteStream(logPath);

function write(text) {
  process.stdout.write(text);
  logStream.write(text);
}
function line(text = "") {
  write(text + "\n");
}

// ── Suites ─────────────────────────────────────────────────────────────────
// CI=true  → Jest exits after one run (no watch mode)
// FORCE_COLOR=0 → strip ANSI codes so the log file stays readable
const baseEnv = { ...process.env, CI: "true", FORCE_COLOR: "0" };

const SUITES = [
  {
    name: "Backend API  (Jest + Supertest)",
    cmd:  "npm",
    args: ["test"],
    cwd:  path.join(ROOT, "server"),
  },
  {
    name: "Frontend components  (Jest + RTL)",
    cmd:  "npm",
    args: ["test", "--", "--watchAll=false", "--forceExit"],
    cwd:  ROOT,
  },
  {
    name: "End-to-end  (Playwright)",
    cmd:  "npm",
    args: ["run", "test:e2e"],
    cwd:  ROOT,
  },
];

// ── Runner ─────────────────────────────────────────────────────────────────
function runSuite(suite) {
  return new Promise((resolve) => {
    line("─".repeat(72));
    line(`SUITE: ${suite.name}`);
    line("─".repeat(72));

    const start = Date.now();
    const child = spawn(suite.cmd, suite.args, {
      cwd:   suite.cwd,
      env:   baseEnv,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => write(chunk.toString()));
    child.stderr.on("data", (chunk) => write(chunk.toString()));

    child.on("close", (code) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const status  = code === 0 ? "PASSED" : "FAILED";
      line();
      line(`► ${suite.name}: ${status}  (exit ${code}, ${elapsed}s)`);
      line();
      resolve({ name: suite.name, status, code, elapsed });
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
  line("═".repeat(72));
  line(`JobTracker Test Run`);
  line(`Started : ${now.toISOString()}`);
  line(`Log file: ${logPath}`);
  line("═".repeat(72));
  line();

  const results = [];
  for (const suite of SUITES) {
    results.push(await runSuite(suite));
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const allPassed = results.every((r) => r.status === "PASSED");

  line("═".repeat(72));
  line("SUMMARY");
  line("═".repeat(72));
  for (const r of results) {
    const mark = r.status === "PASSED" ? "✓" : "✗";
    line(`  ${mark}  ${r.name.padEnd(42)} ${r.status}  (${r.elapsed}s)`);
  }
  line();
  line(allPassed ? "All suites passed." : "One or more suites FAILED.");
  line("═".repeat(72));
  line();

  await new Promise((resolve) => logStream.end(resolve));
  process.exit(allPassed ? 0 : 1);
})();
