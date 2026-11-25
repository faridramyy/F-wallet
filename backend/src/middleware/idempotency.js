import { createHash, randomUUID } from "node:crypto";

import { query } from "../database/db.js";
import { createError } from "../utils/http-error.js";

// Makes a write safe to retry. When a script (an API-token request) sends
//   Idempotency-Key: <any unique string, e.g. a UUID>
// the first response is saved for 24 hours. Sending the same key again
// returns that saved response instead of doing the work twice, so a Shortcut
// that retries after a dropped connection cannot create a duplicate.
//
//   same key, same body, finished   -> the saved response, with the header
//                                      "Idempotent-Replayed: true"
//   same key, same body, running    -> 409 idempotency_in_progress
//   same key, different body        -> 422 idempotency_key_reused
//   server error (5xx)              -> the key is released for a retry
//
// Only API-token requests are covered (keys belong to a token); browser
// requests and requests without the header pass straight through.

const KEY_TTL_HOURS = 24;
const MAX_KEY_LENGTH = 255;

const hashRequest = (req) =>
  createHash("sha256")
    .update(`${req.method} ${req.baseUrl}${req.path}\n`)
    .update(JSON.stringify(req.body ?? {}))
    .digest("hex");

const findKey = async (userId, key) => {
  const result = await query(
    `
      SELECT
        idempotency_key_id,
        request_hash,
        response_status,
        response_body,
        expires_at
      FROM f_wallet.api_idempotency_keys
      WHERE user_id = $1
        AND idempotency_key = $2
    `,
    [userId, key],
  );

  return result.rows[0] ?? null;
};

const deleteKey = (idempotencyKeyId) =>
  query(
    `DELETE FROM f_wallet.api_idempotency_keys WHERE idempotency_key_id = $1`,
    [idempotencyKeyId],
  );

// Saves the response, or releases the key after a server error.
const saveResponse = (idempotencyKeyId, status, body) => {
  if (status >= 500) return deleteKey(idempotencyKeyId);

  return query(
    `
      UPDATE f_wallet.api_idempotency_keys
      SET
        response_status = $2,
        response_body = $3,
        transaction_id = $4
      WHERE idempotency_key_id = $1
    `,
    [
      idempotencyKeyId,
      status,
      JSON.stringify(body),
      body?.data?.transaction?.transaction_id ?? null,
    ],
  );
};

const idempotency = async (req, res, next) => {
  const key = req.headers["idempotency-key"];
  const apiTokenId = req.user?.apiTokenId;

  if (!key || !apiTokenId) return next();

  if (typeof key !== "string" || key.length > MAX_KEY_LENGTH) {
    return next(
      createError(
        `Idempotency-Key must be at most ${MAX_KEY_LENGTH} characters.`,
        400,
        "idempotency_key_invalid",
      ),
    );
  }

  const userId = req.user.sub;
  const requestHash = hashRequest(req);

  try {
    let existing = await findKey(userId, key);

    // An expired key can be used again.
    if (existing && new Date(existing.expires_at) <= new Date()) {
      await deleteKey(existing.idempotency_key_id);
      existing = null;
    }

    if (existing) {
      if (existing.request_hash !== requestHash) {
        return next(
          createError(
            "This Idempotency-Key was already used for a different request.",
            422,
            "idempotency_key_reused",
          ),
        );
      }

      if (existing.response_status === null) {
        return next(
          createError(
            "A request with this Idempotency-Key is still being processed.",
            409,
            "idempotency_in_progress",
          ),
        );
      }

      res.set("Idempotent-Replayed", "true");
      return res
        .status(existing.response_status)
        .type("application/json")
        .send(existing.response_body);
    }

    const idempotencyKeyId = randomUUID();

    try {
      await query(
        `
          INSERT INTO f_wallet.api_idempotency_keys (
            idempotency_key_id,
            user_id,
            api_token_id,
            idempotency_key,
            request_hash,
            expires_at
          )
          VALUES ($1, $2, $3, $4, $5, now() + make_interval(hours => $6))
        `,
        [idempotencyKeyId, userId, apiTokenId, key, requestHash, KEY_TTL_HOURS],
      );
    } catch (error) {
      // Another request with the same key got in first.
      if (error.code === "23505" || error.code === "40001") {
        return next(
          createError(
            "A request with this Idempotency-Key is still being processed.",
            409,
            "idempotency_in_progress",
          ),
        );
      }
      throw error;
    }

    // Save the response before it is sent, so a retry that arrives right
    // after it always finds it.
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      saveResponse(idempotencyKeyId, res.statusCode, body)
        .catch((error) =>
          console.error(
            "[idempotency] Could not save response:",
            error.message,
          ),
        )
        .finally(() => sendJson(body));
      return res;
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Deletes keys past their 24 hours. Run periodically (see server.js).
export const deleteExpiredIdempotencyKeys = async () => {
  const result = await query(
    `DELETE FROM f_wallet.api_idempotency_keys WHERE expires_at < now()`,
  );
  return result.rowCount;
};

export default idempotency;
