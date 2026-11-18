import pool from "./pool.js";
import query from "./query.js";
import transaction from "./transaction.js";

const testConnection = async () => {
  try {
    // Test the reusable query function
    const queryResult = await query(
      `
        SELECT
          $1::text AS test_value,
          current_user,
          current_database(),
          NOW() AS connected_at
      `,
      ["F-Wallet query layer works"],
    );

    console.log("Database query successful!");
    console.log("Test:", queryResult.rows[0].test_value);
    console.log("Database:", queryResult.rows[0].current_database);
    console.log("User:", queryResult.rows[0].current_user);
    console.log("Connected at:", queryResult.rows[0].connected_at);

    // Test the transaction manager
    await transaction(async (client) => {
      const result = await client.query(`
        SELECT current_database() AS database
      `);

      console.log("Transaction successful!", result.rows[0].database);
    });
  } catch (error) {
    console.error("Database test failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

testConnection();
