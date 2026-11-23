import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(currentDirectory, "../../.env"),
});

const env = {
  nodeEnv: process.env.NODE_ENV,
  port: Number(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN,

  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE_NAME,
    maxConnections: Number(process.env.DB_MAX_CONNECTIONS),
  },

  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
  },
};

// const missingCognito = [
//   ["COGNITO_USER_POOL_ID", env.cognito.userPoolId],
//   ["COGNITO_CLIENT_ID", env.cognito.clientId],
// ]
//   .filter(([, value]) => !value)
//   .map(([name]) => name);

// if (missingCognito.length > 0) {
//   throw new Error(
//     `Missing ${missingCognito.join(", ")} in backend/.env. Copy them from the Cognito user pool and its app client.`,
//   );
// }

export default env;
