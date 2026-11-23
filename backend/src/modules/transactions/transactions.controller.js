import { randomUUID } from "node:crypto";
import query from "../../database/query.js";
import transaction from "../../database/transaction.js";

// `::text` makes Postgres send dates as "2026-11-22". Without it the pg driver
// turns a DATE into a JavaScript Date, and JSON.stringify then shifts it by the
// server's timezone offset (a classic off-by-one-day bug).
const transactionColumns = `
  t.transaction_id,
  t.category_id,
  c.category_name,
  t.transaction_type,
  t.status,
  t.amount_cents,
  t.transaction_date::text AS transaction_date,
  t.effective_date::text AS effective_date,
  t.description,
  t.merchant,
  t.source,
  t.notes,
  t.created_at,
  t.updated_at
`;

// Transfers and refunds need extra rules, so they are read-only here.
const EDITABLE_TYPES = ["income", "expense"];

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Ledger convention: each entry is signed from the account's point of view,
// so an account balance is opening_balance_cents + SUM(entries).
// Expense = money leaves the account (negative). Income = money enters it.
const signedAmount = (type, cents) => (type === "expense" ? -cents : cents);

// A "run" is any function (text, params) => Promise<result>. It lets the same
// helper work both inside a DB transaction (client.query) and outside one.
const runOnPool = (text, params) => query(text, params);

const assertAccountUsable = async (run, userId, accountId) => {
  const result = await run(
    `
      SELECT account_id
      FROM public.accounts
      WHERE account_id = $1
        AND user_id = $2
        AND is_archived = FALSE
    `,
    [accountId, userId],
  );

  if (result.rowCount === 0) {
    throw createError("Account not found or archived.", 404);
  }
};

const assertCategoryUsable = async (run, userId, categoryId, type) => {
  const result = await run(
    `
      SELECT category_type, is_archived
      FROM public.categories
      WHERE category_id = $1
        AND user_id = $2
    `,
    [categoryId, userId],
  );

  if (result.rowCount === 0) {
    throw createError("Category not found.", 404);
  }

  const category = result.rows[0];

  if (category.is_archived) {
    throw createError("An archived category cannot be used.", 400);
  }

  if (category.category_type !== type) {
    throw createError(
      `An ${category.category_type} category cannot be used for ${type} transactions.`,
      400,
    );
  }
};

// Adds `entries`, `account_id` and `account_name` to each transaction row and
// converts bigint (which pg returns as a string) to a normal number.
const withEntries = async (run, userId, rows) => {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.transaction_id);
  const placeholders = ids.map((_, index) => `$${index + 2}`).join(", ");

  const entryResult = await run(
    `
      SELECT
        e.entry_id,
        e.transaction_id,
        e.account_id,
        a.account_name,
        e.entry_role,
        e.amount_cents
      FROM public.transaction_entries AS e
      JOIN public.accounts AS a
        ON a.account_id = e.account_id
       AND a.user_id = e.user_id
      WHERE e.user_id = $1
        AND e.transaction_id IN (${placeholders})
      ORDER BY e.created_at ASC, e.entry_id ASC
    `,
    [userId, ...ids],
  );

  const entriesByTransaction = new Map();

  for (const entry of entryResult.rows) {
    const list = entriesByTransaction.get(entry.transaction_id) ?? [];
    list.push({ ...entry, amount_cents: Number(entry.amount_cents) });
    entriesByTransaction.set(entry.transaction_id, list);
  }

  return rows.map((row) => {
    const entries = entriesByTransaction.get(row.transaction_id) ?? [];

    return {
      ...row,
      amount_cents: Number(row.amount_cents),
      account_id: entries[0]?.account_id ?? null,
      account_name: entries[0]?.account_name ?? null,
      entries,
    };
  });
};

const findTransaction = async (run, userId, transactionId) => {
  const result = await run(
    `
      SELECT ${transactionColumns}
      FROM public.transactions AS t
      LEFT JOIN public.categories AS c
        ON c.category_id = t.category_id
       AND c.user_id = t.user_id
      WHERE t.transaction_id = $1
        AND t.user_id = $2
        AND t.status <> 'deleted'
    `,
    [transactionId, userId],
  );

  const [found] = await withEntries(run, userId, result.rows);

  return found ?? null;
};

// GET /api/v1/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const filters = req.validated.query;
    const userId = req.user.sub;

    const conditions = ["t.user_id = $1", "t.status <> 'deleted'"];
    const params = [userId];

    const addCondition = (sql, value) => {
      params.push(value);
      conditions.push(sql.replace("?", `$${params.length}`));
    };

    if (filters.transaction_type) {
      addCondition("t.transaction_type = ?", filters.transaction_type);
    }

    if (filters.category_id) {
      addCondition("t.category_id = ?", filters.category_id);
    }

    if (filters.from) {
      addCondition("t.transaction_date >= ?::date", filters.from);
    }

    if (filters.to) {
      addCondition("t.transaction_date <= ?::date", filters.to);
    }

    // The account lives on the entries table, so filter with EXISTS.
    if (filters.account_id) {
      addCondition(
        `EXISTS (
          SELECT 1
          FROM public.transaction_entries AS e
          WHERE e.user_id = t.user_id
            AND e.transaction_id = t.transaction_id
            AND e.account_id = ?
        )`,
        filters.account_id,
      );
    }

    // Ask for one extra row so we can tell the client if there is a next page
    // without running a separate COUNT query.
    params.push(filters.limit + 1, filters.offset);

    const result = await query(
      `
        SELECT ${transactionColumns}
        FROM public.transactions AS t
        LEFT JOIN public.categories AS c
          ON c.category_id = t.category_id
         AND c.user_id = t.user_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY t.transaction_date DESC, t.created_at DESC, t.transaction_id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );

    const hasMore = result.rows.length > filters.limit;
    const pageRows = result.rows.slice(0, filters.limit);

    const transactions = await withEntries(runOnPool, userId, pageRows);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          has_more: hasMore,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/transactions/:transactionId
export const getTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.validated.params;

    const found = await findTransaction(runOnPool, req.user.sub, transactionId);

    if (!found) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: { transaction: found },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/transactions
export const createTransaction = async (req, res, next) => {
  try {
    const data = req.validated.body;
    const userId = req.user.sub;
    const transactionId = randomUUID();

    // Two inserts that must succeed or fail together, so they share one
    // database transaction.
    const created = await transaction(async (client) => {
      const run = (text, params) => client.query(text, params);

      await assertAccountUsable(run, userId, data.account_id);

      if (data.category_id) {
        await assertCategoryUsable(
          run,
          userId,
          data.category_id,
          data.transaction_type,
        );
      }

      await run(
        `
          INSERT INTO public.transactions (
            transaction_id,
            user_id,
            category_id,
            transaction_type,
            status,
            amount_cents,
            transaction_date,
            effective_date,
            description,
            merchant,
            source,
            notes,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, 'posted', $5, $6::date, $6::date,
            $7, $8, 'manual', $9, NOW(), NOW()
          )
        `,
        [
          transactionId,
          userId,
          data.category_id ?? null,
          data.transaction_type,
          data.amount_cents,
          data.transaction_date,
          data.description ?? null,
          data.merchant ?? null,
          data.notes ?? null,
        ],
      );

      await run(
        `
          INSERT INTO public.transaction_entries (
            entry_id,
            user_id,
            transaction_id,
            account_id,
            entry_role,
            amount_cents,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          randomUUID(),
          userId,
          transactionId,
          data.account_id,
          data.transaction_type,
          signedAmount(data.transaction_type, data.amount_cents),
        ],
      );

      return findTransaction(run, userId, transactionId);
    });

    res.status(201).json({
      success: true,
      data: { transaction: created },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/transactions/:transactionId
export const updateTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.validated.params;
    const updates = req.validated.body;
    const userId = req.user.sub;

    const updated = await transaction(async (client) => {
      const run = (text, params) => client.query(text, params);

      const existing = await findTransaction(run, userId, transactionId);

      if (!existing) {
        throw createError("Transaction not found.", 404);
      }

      if (!EDITABLE_TYPES.includes(existing.transaction_type)) {
        throw createError(
          "Only income and expense transactions can be edited.",
          400,
        );
      }

      const entry = existing.entries[0];

      if (!entry) {
        throw createError("Transaction has no account entry.", 409);
      }

      // PATCH sends only changed fields. Merge them over what is stored:
      // `undefined` means "not sent, keep it", while `null` means "clear it".
      const pick = (key, current) =>
        updates[key] !== undefined ? updates[key] : current;

      const final = {
        type: pick("transaction_type", existing.transaction_type),
        accountId: pick("account_id", entry.account_id),
        categoryId: pick("category_id", existing.category_id),
        amountCents: pick("amount_cents", existing.amount_cents),
        date: pick("transaction_date", existing.transaction_date),
        description: pick("description", existing.description),
        merchant: pick("merchant", existing.merchant),
        notes: pick("notes", existing.notes),
      };

      // Only re-validate what changed. Otherwise a transaction could never be
      // edited again after its category or account was archived.
      if (updates.account_id !== undefined) {
        await assertAccountUsable(run, userId, final.accountId);
      }

      const categoryChanged = updates.category_id !== undefined;
      const typeChanged = final.type !== existing.transaction_type;

      if (final.categoryId && (categoryChanged || typeChanged)) {
        await assertCategoryUsable(run, userId, final.categoryId, final.type);
      }

      await run(
        `
          UPDATE public.transactions
          SET
            category_id = $3,
            transaction_type = $4,
            amount_cents = $5,
            transaction_date = $6::date,
            effective_date = $6::date,
            description = $7,
            merchant = $8,
            notes = $9,
            updated_at = NOW()
          WHERE transaction_id = $1
            AND user_id = $2
            AND status <> 'deleted'
        `,
        [
          transactionId,
          userId,
          final.categoryId,
          final.type,
          final.amountCents,
          final.date,
          final.description,
          final.merchant,
          final.notes,
        ],
      );

      await run(
        `
          UPDATE public.transaction_entries
          SET
            account_id = $3,
            entry_role = $4,
            amount_cents = $5
          WHERE entry_id = $1
            AND user_id = $2
        `,
        [
          entry.entry_id,
          userId,
          final.accountId,
          final.type,
          signedAmount(final.type, final.amountCents),
        ],
      );

      return findTransaction(run, userId, transactionId);
    });

    res.status(200).json({
      success: true,
      data: { transaction: updated },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/transactions/:transactionId
// Soft delete, like archiving accounts and categories: the row stays for
// history and audit, but disappears from every list.
export const deleteTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.validated.params;
    const userId = req.user.sub;

    const existing = await query(
      `
        SELECT transaction_type
        FROM public.transactions
        WHERE transaction_id = $1
          AND user_id = $2
          AND status <> 'deleted'
      `,
      [transactionId, userId],
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    // Deleting one leg of a transfer would leave the other leg orphaned.
    if (!EDITABLE_TYPES.includes(existing.rows[0].transaction_type)) {
      return next(
        createError(
          "Only income and expense transactions can be deleted.",
          400,
        ),
      );
    }

    await query(
      `
        UPDATE public.transactions
        SET
          status = 'deleted',
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE transaction_id = $1
          AND user_id = $2
          AND status <> 'deleted'
      `,
      [transactionId, userId],
    );

    res.status(200).json({
      success: true,
      data: { transaction_id: transactionId },
    });
  } catch (error) {
    next(error);
  }
};
