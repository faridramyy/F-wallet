import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import env from "../config/env.js";

const pool = new AuroraDSQLPool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.database,
  user: env.database.user,
  max: env.database.maxConnections,
  idleTimeoutMillis: 60000,
});

export default pool;
