import { checkConnection } from "../../database/db.js";

export const getHealth = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "F-Wallet API is running",
    timestamp: new Date().toISOString(),
  });
};

export const getDatabaseHealth = async (req, res, next) => {
  try {
    const { database, user, latencyMs } = await checkConnection();

    res.status(200).json({
      status: "ok",
      message: "Database connection is healthy",
      database,
      user,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
    console.error("[db] Health check failed:", error.message);
  }
};
