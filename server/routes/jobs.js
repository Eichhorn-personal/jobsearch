const express = require("express");
const db = require("../db/database");
const authenticate = require("../middleware/authenticate");

const router = express.Router();
router.use(authenticate);

// Map DB snake_case columns → frontend space-delimited field names
const DB_TO_FRONTEND = {
  id: "id",
  date: "Date",
  role: "Role",
  company: "Company",
  source_link: "Source Link",
  company_link: "Company Link",
  resume: "Resume",
  cover_letter: "Cover Letter",
  status: "Status",
  recruiter: "Recruiter",
  hiring_mgr: "Hiring Mgr",
  panel: "Panel",
  hr: "HR",
  comments: "Comments",
};

const FRONTEND_TO_DB = Object.fromEntries(
  Object.entries(DB_TO_FRONTEND).map(([db, fe]) => [fe, db])
);

function rowToFrontend(row) {
  const obj = {};
  for (const [dbCol, feField] of Object.entries(DB_TO_FRONTEND)) {
    if (dbCol === "resume" || dbCol === "cover_letter") {
      obj[feField] = row[dbCol] === 1;
    } else if (dbCol in row) {
      obj[feField] = row[dbCol] ?? "";
    }
  }
  return obj;
}

// GET /api/jobs
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY id ASC")
    .all(req.user.id);
  return res.json(rows.map(rowToFrontend));
});

// POST /api/jobs
router.post("/", (req, res) => {
  const body = req.body;
  const stmt = db.prepare(`
    INSERT INTO jobs
      (user_id, date, role, company, source_link, company_link,
       resume, cover_letter, status, recruiter, hiring_mgr, panel, hr, comments)
    VALUES
      (@user_id, @date, @role, @company, @source_link, @company_link,
       @resume, @cover_letter, @status, @recruiter, @hiring_mgr, @panel, @hr, @comments)
  `);

  const result = stmt.run({
    user_id: req.user.id,
    date: body["Date"] ?? "",
    role: body["Role"] ?? "",
    company: body["Company"] ?? "",
    source_link: body["Source Link"] ?? "",
    company_link: body["Company Link"] ?? "",
    resume: body["Resume"] ? 1 : 0,
    cover_letter: body["Cover Letter"] ? 1 : 0,
    status: body["Status"] ?? "Applied",
    recruiter: body["Recruiter"] ?? "",
    hiring_mgr: body["Hiring Mgr"] ?? "",
    panel: body["Panel"] ?? "",
    hr: body["HR"] ?? "",
    comments: body["Comments"] ?? "",
  });

  const created = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json(rowToFrontend(created));
});

// PUT /api/jobs/:id
router.put("/:id", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  const body = req.body;
  db.prepare(`
    UPDATE jobs SET
      date = @date,
      role = @role,
      company = @company,
      source_link = @source_link,
      company_link = @company_link,
      resume = @resume,
      cover_letter = @cover_letter,
      status = @status,
      recruiter = @recruiter,
      hiring_mgr = @hiring_mgr,
      panel = @panel,
      hr = @hr,
      comments = @comments,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: req.params.id,
    date: body["Date"] ?? job.date,
    role: body["Role"] ?? job.role,
    company: body["Company"] ?? job.company,
    source_link: body["Source Link"] ?? job.source_link,
    company_link: body["Company Link"] ?? job.company_link,
    resume: body["Resume"] !== undefined ? (body["Resume"] ? 1 : 0) : job.resume,
    cover_letter: body["Cover Letter"] !== undefined ? (body["Cover Letter"] ? 1 : 0) : job.cover_letter,
    status: body["Status"] ?? job.status,
    recruiter: body["Recruiter"] ?? job.recruiter,
    hiring_mgr: body["Hiring Mgr"] ?? job.hiring_mgr,
    panel: body["Panel"] ?? job.panel,
    hr: body["HR"] ?? job.hr,
    comments: body["Comments"] ?? job.comments,
  });

  const updated = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  return res.json(rowToFrontend(updated));
});

// DELETE /api/jobs/:id
router.delete("/:id", (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  return res.status(204).send();
});

module.exports = router;
