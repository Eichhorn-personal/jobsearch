#!/usr/bin/env node
// One-off script to import jobs from a JSON export into the production API.
// Usage: node scripts/import-jobs.js <path-to-json> <jwt-token>

const fs = require("fs");

const [,, jsonPath, token] = process.argv;

if (!jsonPath || !token) {
  console.error("Usage: node scripts/import-jobs.js <path-to-json> <jwt-token>");
  process.exit(1);
}

const API = "https://jobtracker-dctgiw.fly.dev/api/jobs";
const records = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

console.log(`Importing ${records.length} records to ${API}\n`);

let ok = 0;
let failed = 0;

(async () => {
for (const record of records) {
  // Strip the local id — the server assigns its own
  const { id, ...body } = record;

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const created = await res.json();
    console.log(`  ✔ [${created.id}] ${record.Company} — ${record.Role}`);
    ok++;
  } else {
    const err = await res.json().catch(() => ({}));
    console.error(`  ✘ ${record.Company} — ${record.Role}: ${err.error ?? res.status}`);
    failed++;
  }
}

console.log(`\nDone: ${ok} imported, ${failed} failed`);
})();
