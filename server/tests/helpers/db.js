// Lazily require the DB so setup.js has already set DB_PATH=':memory:' before this loads.
function getDb() {
  return require("../../db/database");
}

function resetDb() {
  const db = getDb();
  db.exec("DELETE FROM jobs");
  db.exec("DELETE FROM dropdown_options");
  db.exec("DELETE FROM users");
}

module.exports = { getDb, resetDb };
