import { randomUUID } from "node:crypto";
import { query, transaction } from "../../database/db.js";

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

const creditCardFields = [
  "credit_limit_cents",
  "card_last_four",
  "statement_closing_day",
  "payment_due_day",
];

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureUserExists = async (user) => {
  await query(
    `
      INSERT INTO public.app_users (
        user_id,
        email,
        created_at,
        updated_at
      )
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = CASE
          WHEN public.app_users.email IS DISTINCT FROM EXCLUDED.email
          THEN NOW()
          ELSE public.app_users.updated_at
        END
    `,
    [user.sub, user.email],
  );
};

const handleControllerError = (error, next) => {
  if (error.code === "23505") {
    return next(
      createError("An account with this name or position already exists.", 409),
    );
  }

  next(error);
};

// GET /api/v1/accounts
export const getAccounts = async (req, res, next) => {
  try {
    const result = await query(
      `
        SELECT ${accountColumns}
        FROM public.accounts
        WHERE user_id = $1
          AND is_archived = FALSE
        ORDER BY display_order ASC
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

// GET /api/v1/accounts/:accountId
export const getAccount = async (req, res, next) => {
  try {
    const { accountId } = req.validated.params;

    const result = await query(
      `
        SELECT ${accountColumns}
        FROM public.accounts
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
      `,
      [accountId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
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

    await ensureUserExists(req.user);

    const accountId = randomUUID();

    const result = await transaction(async (client) => {
      const orderResult = await client.query(
        `
          SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
          FROM public.accounts
          WHERE user_id = $1
        `,
        [req.user.sub],
      );

      const nextOrder = Number(orderResult.rows[0].next_order);

      return client.query(
        `
          INSERT INTO public.accounts (
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
            display_order,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14,
            NOW(), NOW()
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
          FROM public.accounts
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

      // Move existing positions out of the active range first.
      // This avoids conflicts with the unique (user_id, display_order) index.
      const offset = existingIds.length + accountIds.length + 1;

      await client.query(
        `
          UPDATE public.accounts
          SET display_order = display_order + $2
          WHERE user_id = $1
            AND is_archived = FALSE
        `,
        [userId, offset],
      );

      for (let index = 0; index < accountIds.length; index += 1) {
        await client.query(
          `
            UPDATE public.accounts
            SET
              display_order = $3,
              updated_at = NOW()
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
        FROM public.accounts
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
        FROM public.accounts
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
      `,
      [accountId, req.user.sub],
    );

    if (existingResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
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

    assignments.push("updated_at = NOW()");

    const result = await query(
      `
        UPDATE public.accounts
        SET ${assignments.join(", ")}
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
        RETURNING ${accountColumns}
      `,
      values,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
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
        UPDATE public.accounts
        SET
          is_archived = TRUE,
          archived_at = NOW(),
          updated_at = NOW()
        WHERE account_id = $1
          AND user_id = $2
          AND is_archived = FALSE
        RETURNING ${accountColumns}
      `,
      [accountId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
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
        FROM public.accounts
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
          FROM public.accounts
          WHERE user_id = $1
        `,
        [userId],
      );

      return client.query(
        `
          UPDATE public.accounts
          SET
            is_archived = FALSE,
            archived_at = NULL,
            display_order = $3,
            updated_at = NOW()
          WHERE account_id = $1
            AND user_id = $2
            AND is_archived = TRUE
          RETURNING ${accountColumns}
        `,
        [accountId, userId, Number(orderResult.rows[0].next_order)],
      );
    });

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Archived account not found.",
      });
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
