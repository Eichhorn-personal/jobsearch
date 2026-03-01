const express = require("express");
const db = require("../db/database");
const authenticate = require("../middleware/authenticate");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
router.use(authenticate);

// GET /api/dropdowns
// Returns all fields grouped: { "Status": [{ id, label, sort_order }, ...], ... }
router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM dropdown_options ORDER BY field_name, sort_order, id")
    .all();

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.field_name]) grouped[row.field_name] = [];
    grouped[row.field_name].push({ id: row.id, label: row.label, sort_order: row.sort_order, color: row.color || null });
  }
  return res.json(grouped);
});

// POST /api/dropdowns/:fieldName  { label }
// Add a new option to a field
router.post("/:fieldName", requireAdmin, (req, res) => {
  const { fieldName } = req.params;
  const { label } = req.body;
  if (!label || !label.trim()) {
    return res.status(400).json({ error: "label is required" });
  }

  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM dropdown_options WHERE field_name = ?")
    .get(fieldName).m;

  try {
    const result = db
      .prepare("INSERT INTO dropdown_options (field_name, label, sort_order) VALUES (?, ?, ?)")
      .run(fieldName, label.trim(), maxOrder + 1);
    const created = db.prepare("SELECT * FROM dropdown_options WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json({ id: created.id, label: created.label, sort_order: created.sort_order, color: created.color || null });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "That option already exists for this field" });
    }
    throw err;
  }
});

// PUT /api/dropdowns/:fieldName/reorder  { orderedIds: [1, 3, 2, ...] }
// Bulk-update sort_order to match the supplied array position
router.put("/:fieldName/reorder", requireAdmin, (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: "orderedIds must be an array" });
  }

  const update = db.prepare("UPDATE dropdown_options SET sort_order = ? WHERE id = ? AND field_name = ?");
  db.transaction(() => {
    orderedIds.forEach((id, idx) => update.run(idx, id, req.params.fieldName));
  })();

  return res.json({ ok: true });
});

// PUT /api/dropdowns/option/:id  { label?, color? }
// Rename and/or set color for an option. At least one field must be provided.
router.put("/option/:id", requireAdmin, (req, res) => {
  const { label, color } = req.body;
  const trimmedLabel = label != null ? label.trim() : null;

  if (trimmedLabel === "") {
    return res.status(400).json({ error: "label cannot be empty" });
  }
  if (trimmedLabel === null && color === undefined) {
    return res.status(400).json({ error: "label or color is required" });
  }

  const opt = db.prepare("SELECT * FROM dropdown_options WHERE id = ?").get(req.params.id);
  if (!opt) return res.status(404).json({ error: "Option not found" });

  try {
    if (trimmedLabel !== null && color !== undefined) {
      db.prepare("UPDATE dropdown_options SET label = ?, color = ? WHERE id = ?")
        .run(trimmedLabel, color || null, req.params.id);
    } else if (trimmedLabel !== null) {
      db.prepare("UPDATE dropdown_options SET label = ? WHERE id = ?")
        .run(trimmedLabel, req.params.id);
    } else {
      db.prepare("UPDATE dropdown_options SET color = ? WHERE id = ?")
        .run(color || null, req.params.id);
    }
    const updated = db.prepare("SELECT * FROM dropdown_options WHERE id = ?").get(req.params.id);
    return res.json({ id: updated.id, label: updated.label, sort_order: updated.sort_order, color: updated.color || null });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "That option already exists for this field" });
    }
    throw err;
  }
});

// DELETE /api/dropdowns/option/:id
router.delete("/option/:id", requireAdmin, (req, res) => {
  const opt = db.prepare("SELECT * FROM dropdown_options WHERE id = ?").get(req.params.id);
  if (!opt) return res.status(404).json({ error: "Option not found" });

  db.prepare("DELETE FROM dropdown_options WHERE id = ?").run(req.params.id);
  return res.status(204).send();
});

module.exports = router;
