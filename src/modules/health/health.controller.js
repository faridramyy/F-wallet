import query from "../../database/query.js";

export const getHealth = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "F-Wallet API is running",
    timestamp: new Date().toISOString(),
  });
};

export const getDatabaseHealth = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        current_database() AS database,
        current_user AS user
    `);

    res.status(200).json({
      status: "ok",
      message: "Database connection is healthy",
      database: result.rows[0].database,
      user: result.rows[0].user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
