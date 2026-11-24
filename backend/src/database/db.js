import { fromEnv, fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import env from "../config/env.js";

const { database: config } = env;

// Aurora DSQL hostnames look like: <cluster-id>.dsql.<region>.on.aws
const parseRegionFromHost = (host) =>
  host?.match(/\.dsql\.([a-z0-9-]+)\.on\.aws$/)?.[1];

const assertConfig = () => {
  const missing = ["host", "user", "database"].filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing database configuration: ${missing.join(", ")}. Check backend/.env.`,
    );
  }
};

// Prefer explicit static keys from .env; otherwise fall back to the standard
// AWS chain (env, SSO, shared profile, instance/container role).
const credentialsProvider = () =>
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? fromEnv()
    : fromNodeProviderChain();

const createPool = () => {
  assertConfig();

  const pool = new AuroraDSQLPool({
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    region: parseRegionFromHost(config.host),
    customCredentialsProvider: credentialsProvider(),
    max: config.maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    maxLifetimeSeconds: 50 * 60,
    retry: { maxRetries: 3 },
  });

  pool.on("error", (error) => {
    console.error("[db] Idle client error:", error.message);
  });

  return pool;
};

let pool;

const getPool = () => {
  pool ??= createPool();
  return pool;
};

export const query = (text, params = []) => getPool().query(text, params);

export const transaction = (callback) => getPool().transaction(callback);

export const checkConnection = async () => {
  const startedAt = Date.now();

  const { rows } = await query(
    "SELECT current_database() AS database, current_user AS user, now() AS server_time",
  );

  return {
    ...rows[0],
    latencyMs: Date.now() - startedAt,
  };
};

export const closePool = async () => {
  if (!pool) {
    return;
  }

  const current = pool;
  pool = undefined;
  await current.end();
};
