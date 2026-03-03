require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const { log } = require("./logger");
const app = require("./app");

const PORT = process.env.PORT || 3001;

process.on("uncaughtException", (err) => {
  log("UNCAUGHT_EXCEPTION", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log("UNHANDLED_REJECTION", { reason: String(reason) });
});

const server = app.listen(PORT, () => {
  log("SERVER_START", { port: PORT });
});

server.on("error", (err) => {
  log("SERVER_ERROR", { error: err.code === "EADDRINUSE" ? `Port ${PORT} is already in use` : err.message });
  process.exit(1);
});
