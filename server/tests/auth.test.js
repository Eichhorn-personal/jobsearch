const request = require("supertest");
const app = require("../app");
const { resetDb } = require("./helpers/db");
const { createUser, authHeader } = require("./helpers/auth");

beforeEach(() => resetDb());

// ── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  test("201 — valid email and password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "new@example.com", password: "Password1!" });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe("new@example.com");
    expect(res.body.password).toBeUndefined();
  });

  test("409 — duplicate email", async () => {
    createUser({ username: "dup@example.com" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "dup@example.com", password: "Password1!" });
    expect(res.status).toBe(409);
  });

  test("400 — invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "not-an-email", password: "Password1!" });
    expect(res.status).toBe(400);
  });

  test("400 — password too short (< 8 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "short@example.com", password: "abc" });
    expect(res.status).toBe(400);
  });

  test("400 — password too long (> 128 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "long@example.com", password: "a".repeat(129) });
    expect(res.status).toBe(400);
  });

  test("400 — missing password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "missing@example.com" });
    expect(res.status).toBe(400);
  });

  test("403 — ALLOWED_EMAILS set and email not in list", async () => {
    process.env.ALLOWED_EMAILS = "allowed@example.com";
    try {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "notallowed@example.com", password: "Password1!" });
      expect(res.status).toBe(403);
    } finally {
      delete process.env.ALLOWED_EMAILS;
    }
  });

  test("201 — email in ALLOWED_EMAILS list is accepted", async () => {
    process.env.ALLOWED_EMAILS = "allowed@example.com";
    try {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ username: "allowed@example.com", password: "Password1!" });
      expect(res.status).toBe(201);
    } finally {
      delete process.env.ALLOWED_EMAILS;
    }
  });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    createUser({ username: "user@example.com", password: "correct-password-1!" });
  });

  test("200 — correct credentials returns JWT and user object", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "user@example.com", password: "correct-password-1!" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("user@example.com");
    expect(res.body.user.password).toBeUndefined();
  });

  test("401 — wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "user@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  test("401 — unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nobody@example.com", password: "Password1!" });
    expect(res.status).toBe(401);
  });

  test("400 — missing password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "user@example.com" });
    expect(res.status).toBe(400);
  });

  test("400 — missing username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "Password1!" });
    expect(res.status).toBe(400);
  });

  test("400 — invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "not-an-email", password: "Password1!" });
    expect(res.status).toBe(400);
  });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  test("204 — authenticated user", async () => {
    const user = createUser({ username: "logout@example.com" });
    const res = await request(app)
      .post("/api/auth/logout")
      .set(authHeader(user));
    expect(res.status).toBe(204);
  });

  test("401 — unauthenticated", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(401);
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  test("200 — valid token returns user without sensitive fields", async () => {
    const user = createUser({ username: "me@example.com" });
    const res = await request(app)
      .get("/api/auth/me")
      .set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body.username).toBe("me@example.com");
    expect(res.body.password).toBeUndefined();
  });

  test("401 — no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("401 — malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
  });

  test("401 — token signed with wrong secret", async () => {
    const jwt = require("jsonwebtoken");
    const badToken = jwt.sign({ sub: 1, username: "x@x.com", role: "contributor" }, "wrong-secret");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  test("401 — token for deleted user", async () => {
    const user = createUser({ username: "deleted@example.com" });
    const header = authHeader(user);
    // Delete the user from the DB
    const { getDb } = require("./helpers/db");
    getDb().prepare("DELETE FROM users WHERE id = ?").run(user.id);
    const res = await request(app).get("/api/auth/me").set(header);
    expect(res.status).toBe(401);
  });
});
