const fs = require("fs");
const path = require("path");

const logPath = process.env.LOG_PATH || path.join(__dirname, "app.log");

function log(event, data) {
  const ts = new Date().toISOString();
  const fields = Object.entries(data)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  const line = `[${ts}] ${event} ${fields}\n`;
  process.stdout.write(line); // also visible in Render logs
  try {
    fs.appendFileSync(logPath, line);
  } catch (err) {
    process.stderr.write(`Logger write failed: ${err.message}\n`);
  }
}

module.exports = { log };
