import pool from "./pool.js";

const testConnection = async () => {
  try {
    const result = await pool.query(`
      SELECT
        current_user,
        current_database(),
        NOW() AS connected_at
    `);

    console.log("Database connection successful!");
    console.log("Database:", result.rows[0].current_database);
    console.log("User:", result.rows[0].current_user);
    console.log("Connected at:", result.rows[0].connected_at);
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

testConnection();
