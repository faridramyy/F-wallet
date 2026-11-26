import { createHash, randomBytes } from "node:crypto";

import { query } from "../../database/db.js";

// Personal API tokens let scripts (e.g. an iPhone Shortcut) call a few
// endpoints without signing in through Cognito.
//
// A token looks like "fw_<43 url-safe characters>" (32 random bytes). Only
// its SHA-256 hash is stored, so the token itself is shown once, when it is
// created, and a database leak does not reveal usable tokens.

export const TOKEN_PREFIX = "fw_";

export const generateToken = () =>
  TOKEN_PREFIX + randomBytes(32).toString("base64url");

export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

// Columns safe to return to the client (never the hash).
export const apiTokenColumns = `
  api_token_id,
  token_name,
  token_last_four,
  status,
  last_used_at,
  expires_at,
  revoked_at,
  created_at
`;

// The token's row with its owner's email, whatever its status, or null.
export const findTokenByValue = async (token) => {
  const result = await query(
    `
      SELECT
        t.api_token_id,
        t.user_id,
        t.status,
        t.expires_at,
        u.email
      FROM f_wallet.api_tokens AS t
      JOIN f_wallet.users AS u
        ON u.user_id = t.user_id
      WHERE t.token_hash = $1
    `,
    [hashToken(token)],
  );

  return result.rows[0] ?? null;
};

// Records that a token was used. At most once a minute per token, so a
// burst of requests does not write the same row over and over.
export const touchToken = (apiTokenId) =>
  query(
    `
      UPDATE f_wallet.api_tokens
      SET last_used_at = now()
      WHERE api_token_id = $1
        AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')
    `,
    [apiTokenId],
  );
