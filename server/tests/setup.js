const os = require("os");
const path = require("path");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-minimum-32-characters-long";
process.env.DB_PATH = ":memory:";
process.env.LOG_PATH = path.join(os.tmpdir(), "jobsearch-test.log");
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
// ALLOWED_EMAILS intentionally unset — registration is open by default in tests
// ADMIN_EMAIL intentionally unset — no auto-admin assignment in tests
