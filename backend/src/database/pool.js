import { fromEnv } from "@aws-sdk/credential-providers";
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import env from "../config/env.js";

const pool = new AuroraDSQLPool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.database,
  user: env.database.user,
  max: env.database.maxConnections,
  idleTimeoutMillis: 60000,

  // Load credentials from AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env.
  // This avoids relying on a live SSO session that expires.
  customCredentialsProvider: fromEnv(),

  retry: {
    maxRetries: 2,
  },
});

export default pool;
