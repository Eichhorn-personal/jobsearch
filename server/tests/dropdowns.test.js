const request = require("supertest");
const app = require("../app");
const { getDb, resetDb } = require("./helpers/db");
const { createUser, authHeader } = require("./helpers/auth");

let admin, contributor;

beforeEach(() => {
  resetDb();
  admin = createUser({ username: "admin@example.com", role: "admin" });
  contributor = createUser({ username: "user@example.com", role: "contributor" });
});

function seedOption(fieldName, label, sort_order = 0) {
  return getDb()
    .prepare("INSERT INTO dropdown_options (field_name, label, sort_order) VALUES (?, ?, ?)")
    .run(fieldName, label, sort_order);
}

// ── GET /api/dropdowns ───────────────────────────────────────────────────────

describe("GET /api/dropdowns", () => {
  test("200 — contributor can read dropdowns", async () => {
    const res = await request(app).get("/api/dropdowns").set(authHeader(contributor));
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
  });

  test("200 — admin can read dropdowns", async () => {
    const res = await request(app).get("/api/dropdowns").set(authHeader(admin));
    expect(res.status).toBe(200);
  });

  test("401 — unauthenticated", async () => {
    const res = await request(app).get("/api/dropdowns");
    expect(res.status).toBe(401);
  });

  test("returns options grouped by field name", async () => {
    seedOption("Status", "Applied", 0);
    seedOption("Status", "Rejected", 1);
    seedOption("Priority", "High", 0);
    const res = await request(app).get("/api/dropdowns").set(authHeader(contributor));
    expect(res.status).toBe(200);
    expect(res.body.Status).toHaveLength(2);
    expect(res.body.Priority).toHaveLength(1);
  });
});

// ── POST /api/dropdowns/:fieldName ───────────────────────────────────────────

describe("POST /api/dropdowns/:fieldName", () => {
  test("201 — admin can add an option", async () => {
    const res = await request(app)
      .post("/api/dropdowns/Status")
      .set(authHeader(admin))
      .send({ label: "Offer" });
    expect(res.status).toBe(201);
    expect(res.body.label).toBe("Offer");
  });

  test("403 — contributor cannot add options", async () => {
    const res = await request(app)
      .post("/api/dropdowns/Status")
      .set(authHeader(contributor))
      .send({ label: "Offer" });
    expect(res.status).toBe(403);
  });

  test("409 — duplicate label in same field", async () => {
    seedOption("Status", "Applied", 0);
    const res = await request(app)
      .post("/api/dropdowns/Status")
      .set(authHeader(admin))
      .send({ label: "Applied" });
    expect(res.status).toBe(409);
  });

  test("400 — empty label rejected", async () => {
    const res = await request(app)
      .post("/api/dropdowns/Status")
      .set(authHeader(admin))
      .send({ label: "   " });
    expect(res.status).toBe(400);
  });

  test("401 — unauthenticated", async () => {
    const res = await request(app)
      .post("/api/dropdowns/Status")
      .send({ label: "Offer" });
    expect(res.status).toBe(401);
  });
});

// ── PUT /api/dropdowns/option/:id ────────────────────────────────────────────

describe("PUT /api/dropdowns/option/:id (rename)", () => {
  test("200 — admin can rename an option", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "Old Label", 0);
    const res = await request(app)
      .put(`/api/dropdowns/option/${id}`)
      .set(authHeader(admin))
      .send({ label: "New Label" });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe("New Label");
  });

  test("403 — contributor cannot rename options", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "Applied", 0);
    const res = await request(app)
      .put(`/api/dropdowns/option/${id}`)
      .set(authHeader(contributor))
      .send({ label: "Changed" });
    expect(res.status).toBe(403);
  });

  test("404 — nonexistent option", async () => {
    const res = await request(app)
      .put("/api/dropdowns/option/99999")
      .set(authHeader(admin))
      .send({ label: "X" });
    expect(res.status).toBe(404);
  });

  test("401 — unauthenticated", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "Applied", 0);
    const res = await request(app)
      .put(`/api/dropdowns/option/${id}`)
      .send({ label: "Changed" });
    expect(res.status).toBe(401);
  });
});

// ── PUT /api/dropdowns/:fieldName/reorder ────────────────────────────────────

describe("PUT /api/dropdowns/:fieldName/reorder", () => {
  test("200 — admin can reorder options", async () => {
    const r1 = seedOption("Status", "First", 0);
    const r2 = seedOption("Status", "Second", 1);
    const res = await request(app)
      .put("/api/dropdowns/Status/reorder")
      .set(authHeader(admin))
      .send({ orderedIds: [r2.lastInsertRowid, r1.lastInsertRowid] });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("403 — contributor cannot reorder", async () => {
    const r1 = seedOption("Status", "First", 0);
    const r2 = seedOption("Status", "Second", 1);
    const res = await request(app)
      .put("/api/dropdowns/Status/reorder")
      .set(authHeader(contributor))
      .send({ orderedIds: [r2.lastInsertRowid, r1.lastInsertRowid] });
    expect(res.status).toBe(403);
  });

  test("400 — orderedIds must be an array", async () => {
    const res = await request(app)
      .put("/api/dropdowns/Status/reorder")
      .set(authHeader(admin))
      .send({ orderedIds: "not-an-array" });
    expect(res.status).toBe(400);
  });
});

// ── DELETE /api/dropdowns/option/:id ─────────────────────────────────────────

describe("DELETE /api/dropdowns/option/:id", () => {
  test("204 — admin can delete an option", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "ToDelete", 0);
    const res = await request(app)
      .delete(`/api/dropdowns/option/${id}`)
      .set(authHeader(admin));
    expect(res.status).toBe(204);
  });

  test("option is actually removed after deletion", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "Gone", 0);
    await request(app).delete(`/api/dropdowns/option/${id}`).set(authHeader(admin));
    const row = getDb().prepare("SELECT * FROM dropdown_options WHERE id = ?").get(id);
    expect(row).toBeUndefined();
  });

  test("403 — contributor cannot delete options", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "Applied", 0);
    const res = await request(app)
      .delete(`/api/dropdowns/option/${id}`)
      .set(authHeader(contributor));
    expect(res.status).toBe(403);
  });

  test("404 — nonexistent option", async () => {
    const res = await request(app)
      .delete("/api/dropdowns/option/99999")
      .set(authHeader(admin));
    expect(res.status).toBe(404);
  });

  test("401 — unauthenticated", async () => {
    const { lastInsertRowid: id } = seedOption("Status", "Applied", 0);
    const res = await request(app).delete(`/api/dropdowns/option/${id}`);
    expect(res.status).toBe(401);
  });
});
