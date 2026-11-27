import serverless from "serverless-http";

import app from "./app.js";
import { warmUpAuth } from "./middleware/auth.js";
import { deleteExpiredIdempotencyKeys } from "./middleware/idempotency.js";

// AWS Lambda entry point (handler "backend/src/lambda.handler").
// server.js is the local / long-running entry point; this one is used in
// production. The same function handles two kinds of events:
//
//   1. HTTP requests from the Lambda function URL, passed to the Express app.
//   2. The hourly EventBridge schedule, sent with the JSON input
//        { "task": "cleanup-idempotency-keys" }
//      which deletes expired idempotency keys (server.js does this with a
//      timer, which a Lambda cannot keep running).

export const CLEANUP_TASK = "cleanup-idempotency-keys";

// Runs once per cold start, so the first request doesn't wait for the
// Cognito signing keys. A failure is only logged: verification retries.
warmUpAuth().catch((error) =>
  console.error(`Cognito keys could not be loaded: ${error.message}`),
);

const handleHttp = serverless(app);

export const handler = async (event, context) => {
  if (event?.task === CLEANUP_TASK) {
    const deleted = await deleteExpiredIdempotencyKeys();
    console.log(`Deleted ${deleted} expired idempotency keys`);
    return { deleted };
  }

  return handleHttp(event, context);
};
