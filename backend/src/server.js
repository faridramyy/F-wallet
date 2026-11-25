import app from "./app.js";
import env from "./config/env.js";
import { checkConnection, closePool } from "./database/db.js";
import { warmUpAuth } from "./middleware/auth.js";
import { deleteExpiredIdempotencyKeys } from "./middleware/idempotency.js";

const server = app.listen(env.port, () => {
  console.log(
    `F-Wallet API running in ${env.nodeEnv} mode on port ${env.port}`,
  );

  checkConnection()
    .then(({ user, database, latencyMs }) =>
      console.log(
        `Database connected as '${user}' to '${database}' (${latencyMs} ms)`,
      ),
    )
    .catch((error) => {
      console.error(`Database connection failed: ${error.message}`);
    });

  warmUpAuth()
    .then(() =>
      console.log(`Cognito keys loaded for pool '${env.cognito.userPoolId}'`),
    )
    .catch((error) => {
      console.error(
        `Cognito keys could not be loaded for pool '${env.cognito.userPoolId}': ${error.message}`,
      );
    });
});

// Idempotency keys only matter for 24 hours; clear out old ones hourly.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const cleanupTimer = setInterval(() => {
  deleteExpiredIdempotencyKeys()
    .then((count) => {
      if (count > 0) console.log(`Deleted ${count} expired idempotency keys`);
    })
    .catch((error) =>
      console.error("Idempotency key cleanup failed:", error.message),
    );
}, CLEANUP_INTERVAL_MS);

// Don't keep the process alive just for the cleanup timer.
cleanupTimer.unref();

let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  clearInterval(cleanupTimer);

  console.log(`${signal} received. Starting graceful shutdown...`);

  server.close(async (error) => {
    if (error) {
      console.error("Error closing HTTP server:", error);
      process.exitCode = 1;
    }

    try {
      await closePool();
      console.log("Database connection pool closed.");
    } catch (poolError) {
      console.error("Error closing database pool:", poolError);
      process.exitCode = 1;
    }

    console.log("F-Wallet API shutdown complete.");
  });
};

// Listen for operating system termination signals and trigger a graceful shutdown.
// SIGTERM: Sent by the operating system or hosting platform when the application
// is requested to terminate.
// SIGINT: Usually sent when the user presses Ctrl + C in the terminal.
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
