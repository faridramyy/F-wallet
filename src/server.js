import app from "./app.js";
import env from "./config/env.js";
import pool from "./database/pool.js";

const server = app.listen(env.port, () => {
  console.log(
    `F-Wallet API running in ${env.nodeEnv} mode on port ${env.port}`,
  );
});

let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`${signal} received. Starting graceful shutdown...`);

  server.close(async (error) => {
    if (error) {
      console.error("Error closing HTTP server:", error);
      process.exitCode = 1;
    }

    try {
      await pool.end();
      console.log("Database connection pool closed.");
    } catch (poolError) {
      console.error("Error closing database pool:", poolError);
      process.exitCode = 1;
    }

    console.log("F-Wallet API shutdown complete.");
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
