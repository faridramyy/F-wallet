import { randomUUID } from "node:crypto";

import { query } from "../../database/db.js";
import { createError } from "../../utils/http-error.js";
import { upsertUser } from "../users/users.service.js";
import {
  apiTokenColumns,
  generateToken,
  hashToken,
} from "./api-tokens.service.js";

// A user can have at most this many active tokens.
const MAX_ACTIVE_TOKENS = 10;

// GET /api/v1/api-tokens
// Active tokens first, then revoked ones (kept for history), newest first.
export const getApiTokens = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT ${apiTokenColumns}
        FROM f_wallet.api_tokens
        WHERE user_id = $1
        ORDER BY (status = 'active') DESC, created_at DESC
      `,
      [req.user.sub],
    );

    res.status(200).json({
      success: true,
      data: { api_tokens: result.rows },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/api-tokens
// The only response that ever contains the token itself.
export const createApiToken = async (req, res, next) => {
  try {
    const { token_name: tokenName, expires_in_days: expiresInDays } =
      req.validated.body;
    const userId = req.user.sub;

    await upsertUser(req.user);

    const active = await query(
      `
        SELECT count(*)::int AS count
        FROM f_wallet.api_tokens
        WHERE user_id = $1
          AND status = 'active'
      `,
      [userId],
    );

    if (active.rows[0].count >= MAX_ACTIVE_TOKENS) {
      return next(
        createError(
          `You can have up to ${MAX_ACTIVE_TOKENS} active tokens. Revoke one first.`,
          409,
          "token_limit",
        ),
      );
    }

    const token = generateToken();

    const result = await query(
      `
        INSERT INTO f_wallet.api_tokens (
          api_token_id,
          user_id,
          token_name,
          token_hash,
          token_last_four,
          expires_at
        )
        VALUES (
          $1, $2, $3, $4, $6,
          CASE WHEN $5::int IS NULL THEN NULL
               ELSE now() + make_interval(days => $5::int)
          END
        )
        RETURNING ${apiTokenColumns}
      `,
      [
        randomUUID(),
        userId,
        tokenName,
        hashToken(token),
        expiresInDays,
        // Shown in Settings to tell tokens apart; too short to guess from.
        token.slice(-4),
      ],
    );

    res.status(201).json({
      success: true,
      data: { api_token: result.rows[0], token },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/api-tokens/:apiTokenId
// Revokes the token; it stops working at once. The row stays because
// idempotency keys reference it.
export const revokeApiToken = async (req, res, next) => {
  try {
    const result = await query(
      `
        UPDATE f_wallet.api_tokens
        SET
          status = 'revoked',
          revoked_at = now(),
          updated_at = DEFAULT
        WHERE api_token_id = $1
          AND user_id = $2
          AND status = 'active'
        RETURNING ${apiTokenColumns}
      `,
      [req.validated.params.apiTokenId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return next(createError("Active token not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: { api_token: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};
