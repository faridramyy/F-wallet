import app from "./app.js";
import env from "./config/env.js";
import { checkConnection, closePool } from "./database/db.js";
import { warmUpAuth } from "./middleware/auth.js";

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
