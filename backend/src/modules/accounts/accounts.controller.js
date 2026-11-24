import { randomUUID } from "node:crypto";
import { query, transaction } from "../../database/db.js";
import { conflictOnDuplicate, createError } from "../../utils/http-error.js";
import { upsertUser } from "../users/users.service.js";

export const accountColumns = `
  account_id,
  account_name,
  account_type,
  institution_name,
  currency,
  opening_balance_cents,
  credit_limit_cents,
  card_last_four,
  statement_closing_day,
  payment_due_day,
  include_in_net_worth,
  is_archived,
  archived_at,
  notes,
  display_order,
  created_at,
  updated_at
`;

// Active accounts with `entries_total_cents`: the sum of the account's ledger
// entries from posted (not deleted or scheduled) transactions. Entries are
// signed from the account's point of view, so for cash, checking and savings
// the live balance is opening_balance_cents + entries_total_cents. The
// client applies the credit-card rule (see frontend/src/lib/accounts.js).
// $1 must be the user id.
export const activeAccountsWithTotalsSql = `
  SELECT
    ${accountColumns
      .split(",")
      .map((column) => `a.${column.trim()}`)
      .join(",\n    ")},
    COALESCE(totals.entries_total_cents, 0) AS entries_total_cents
  FROM f_wallet.accounts a
  LEFT JOIN (
    SELECT e.account_id, SUM(e.amount_cents) AS entries_total_cents
    FROM f_wallet.transaction_entries e
    JOIN f_wallet.transactions t
      ON t.user_id = e.user_id
     AND t.transaction_id = e.transaction_id
    WHERE e.user_id = $1
      AND t.status = 'posted'
    GROUP BY e.account_id
  ) totals ON totals.account_id = a.account_id
  WHERE a.user_id = $1
    AND a.is_archived = FALSE
  ORDER BY a.display_order ASC
`;

const creditCardFields = [
  "credit_limit_cents",
  "card_last_four",
  "statement_closing_day",
  "payment_due_day",
];

// A duplicate name/position/month becomes a 409 instead of a 500.
const handleControllerError = conflictOnDuplicate(
  "An account with this name or position already exists.",
);

// GET /api/v1/accounts
export const getAccounts = async (req, res, next) => {
  try {
    const result = await query(activeAccountsWithTotalsSql, [req.user.sub]);

    res.status(200).json({
      success: true,
      data: {
        accounts: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/accounts/:accountId
export const getAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validated.params;

    const result = await query(
      `
        SELECT ${accountColumns}
        FROM f_wallet.accounts
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
      `,
      [accountId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return next(createError("Account not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        account: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/accounts
export const createAccount = async (req, res, next) => {
  try {
    const data = req.validated.body;

    await upsertUser(req.user);

    const accountId = randomUUID();

    const result = await transaction(async (client) => {
      const orderResult = await client.query(
        `
          SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
          FROM f_wallet.accounts
          WHERE user_id = $1
        `,
        [req.user.sub],
      );

      const nextOrder = Number(orderResult.rows[0].next_order);

      return client.query(
        `
          INSERT INTO f_wallet.accounts (
            account_id,
            user_id,
            account_name,
            account_type,
            institution_name,
            currency,
            opening_balance_cents,
            credit_limit_cents,
            card_last_four,
            statement_closing_day,
            payment_due_day,
            include_in_net_worth,
            notes,
            display_order
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14
          )
          RETURNING ${accountColumns}
        `,
        [
          accountId,
          req.user.sub,
          data.account_name,
          data.account_type,
          data.institution_name ?? null,
          data.currency ?? "CAD",
          data.opening_balance_cents ?? 0,
          data.credit_limit_cents ?? null,
          data.card_last_four ?? null,
          data.statement_closing_day ?? null,
          data.payment_due_day ?? null,
          data.include_in_net_worth ?? true,
          data.notes ?? null,
          nextOrder,
        ],
      );
    });

    res.status(201).json({
      success: true,
      data: {
        account: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PATCH /api/v1/accounts/order
export const reorderAccounts = async (req, res, next) => {
  try {
    const { account_ids: accountIds } = req.validated.body;
    const userId = req.user.sub;

    if (new Set(accountIds).size !== accountIds.length) {
      return next(createError("Duplicate account IDs are not allowed.", 400));
    }

    await transaction(async (client) => {
      const existingResult = await client.query(
        `
          SELECT account_id
          FROM f_wallet.accounts
          WHERE user_id = $1
            AND is_archived = FALSE
        `,
        [userId],
      );

      const existingIds = existingResult.rows.map(
        (account) => account.account_id,
      );

      if (
        existingIds.length !== accountIds.length ||
        !accountIds.every((id) => existingIds.includes(id))
      ) {
        throw createError(
          "The submitted account list does not match your active accounts.",
          400,
        );
      }

      // Move active positions above every used position first (archived
      // accounts keep theirs). This avoids conflicts with the unique
      // (user_id, display_order) index while the new order is written.
      await client.query(
        `
          UPDATE f_wallet.accounts
          SET display_order = display_order + (
            SELECT COALESCE(MAX(display_order), 0) + 1
            FROM f_wallet.accounts
            WHERE user_id = $1
          )
          WHERE user_id = $1
            AND is_archived = FALSE
        `,
        [userId],
      );

      for (let index = 0; index < accountIds.length; index += 1) {
        await client.query(
          `
            UPDATE f_wallet.accounts
            SET
              display_order = $3,
              updated_at = DEFAULT
            WHERE account_id = $1
              AND user_id = $2
              AND is_archived = FALSE
          `,
          [accountIds[index], userId, index],
        );
      }
    });

    const result = await query(
      `
        SELECT ${accountColumns}
        FROM f_wallet.accounts
        WHERE user_id = $1
          AND is_archived = FALSE
        ORDER BY display_order ASC
      `,
      [userId],
    );

    res.status(200).json({
      success: true,
      data: {
        accounts: result.rows,
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// PATCH /api/v1/accounts/:accountId
export const updateAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validated.params;
    const updates = req.validated.body;

    const existingResult = await query(
      `
        SELECT ${accountColumns}
        FROM f_wallet.accounts
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
      `,
      [accountId, req.user.sub],
    );

    if (existingResult.rowCount === 0) {
      return next(createError("Account not found.", 404));
    }

    const existingAccount = existingResult.rows[0];

    const finalAccountType =
      updates.account_type ?? existingAccount.account_type;

    if (finalAccountType !== "credit_card") {
      for (const field of creditCardFields) {
        if (updates[field] != null) {
          return next(
            createError(
              `${field} is only allowed for credit card accounts.`,
              400,
            ),
          );
        }
      }
    }

    const fields = Object.keys(updates);
    const values = [accountId, req.user.sub];

    const assignments = fields.map((field, index) => {
      values.push(updates[field]);
      return `${field} = $${index + 3}`;
    });

    if (finalAccountType !== "credit_card") {
      for (const field of creditCardFields) {
        if (!fields.includes(field)) {
          assignments.push(`${field} = NULL`);
        }
      }
    }

    assignments.push("updated_at = DEFAULT");

    const result = await query(
      `
        UPDATE f_wallet.accounts
        SET ${assignments.join(", ")}
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
        RETURNING ${accountColumns}
      `,
      values,
    );

    if (result.rowCount === 0) {
      return next(createError("Account not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        account: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};

// DELETE /api/v1/accounts/:accountId
export const archiveAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validated.params;

    const result = await query(
      `
        UPDATE f_wallet.accounts
        SET
          is_archived = TRUE,
          archived_at = NOW(),
          updated_at = DEFAULT
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
        RETURNING ${accountColumns}
      `,
      [accountId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return next(createError("Account not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        account: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/accounts/archived
export const getArchivedAccounts = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT ${accountColumns}
        FROM f_wallet.accounts
        WHERE user_id = $1
          AND is_archived = TRUE
        ORDER BY archived_at DESC, account_name ASC
      `,
      [req.user.sub],
    );

    res.status(200).json({
      success: true,
      data: {
        accounts: result.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/accounts/:accountId/restore
export const restoreAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validated.params;
    const userId = req.user.sub;

    const result = await transaction(async (client) => {
      // The restored account goes to the end of the active list. Every
      // account keeps a unique display_order, archived ones included.
      const orderResult = await client.query(
        `
          SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
          FROM f_wallet.accounts
          WHERE user_id = $1
        `,
        [userId],
      );

      return client.query(
        `
          UPDATE f_wallet.accounts
          SET
            is_archived = FALSE,
            archived_at = NULL,
            display_order = $3,
            updated_at = DEFAULT
          WHERE account_id = $1
            AND user_id = $2
            AND is_archived = TRUE
          RETURNING ${accountColumns}
        `,
        [accountId, userId, Number(orderResult.rows[0].next_order)],
      );
    });

    if (result.rowCount === 0) {
      return next(createError("Archived account not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        account: result.rows[0],
      },
    });
  } catch (error) {
    handleControllerError(error, next);
  }
};
