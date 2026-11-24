import { randomUUID } from "node:crypto";

import { transaction } from "../../database/db.js";
import { createError } from "../../utils/http-error.js";
import { pickUpdate } from "../../utils/patch.js";
import {
  assertAccountUsable,
  findTransaction,
  insertEntry,
} from "./transactions.controller.js";

// A refund is money returned for an expense. It is one transaction row
// (type "refund") pointing at the expense through original_transaction_id,
// with one +amount ledger entry on the account the money comes back to.
// It keeps the expense's category, so the category's spending goes down by
// the refunded amount. All refunds of an expense together can never exceed
// the expense.

const formatDollars = (cents) => `$${(cents / 100).toFixed(2)}`;

// The expense a refund belongs to, checked to be a live expense.
const findRefundableExpense = async (run, userId, expenseId) => {
  const expense = await findTransaction(run, userId, expenseId);

  if (!expense) {
    throw createError("Expense not found.", 404);
  }

  if (expense.transaction_type !== "expense") {
    throw createError("Only expenses can be refunded.", 400);
  }

  return expense;
};

const assertWithinRefundable = (amountCents, refundableCents) => {
  if (amountCents > refundableCents) {
    throw createError(
      refundableCents > 0
        ? `You can refund at most ${formatDollars(refundableCents)} for this expense.`
        : "This expense has already been fully refunded.",
      400,
    );
  }
};

// POST /api/v1/transactions/:transactionId/refunds
// :transactionId is the expense being refunded.
export const createRefund = async (req, res, next) => {
  try {
    const { transactionId: expenseId } = req.validated.params;
    const data = req.validated.body;
    const userId = req.user.sub;
    const refundId = randomUUID();

    const created = await transaction(async (client) => {
      const run = (text, params) => client.query(text, params);

      const expense = await findRefundableExpense(run, userId, expenseId);

      assertWithinRefundable(
        data.amount_cents,
        expense.amount_cents - expense.refunded_cents,
      );

      // By default the money goes back to the account that paid.
      const accountId = data.account_id ?? expense.account_id;
      await assertAccountUsable(run, userId, accountId);

      await run(
        `
          INSERT INTO f_wallet.transactions (
            transaction_id,
            user_id,
            category_id,
            original_transaction_id,
            transaction_type,
            status,
            amount_cents,
            transaction_date,
            effective_date,
            description,
            merchant,
            source,
            notes
          )
          VALUES (
            $1, $2, $3, $4, 'refund', 'posted', $5, $6::date, $6::date,
            $7, $8, 'manual', $9
          )
        `,
        [
          refundId,
          userId,
          expense.category_id,
          expense.transaction_id,
          data.amount_cents,
          data.transaction_date,
          data.description ?? null,
          expense.merchant,
          data.notes ?? null,
        ],
      );

      await insertEntry(run, userId, {
        transactionId: refundId,
        accountId,
        role: "refund",
        amountCents: data.amount_cents,
      });

      return findTransaction(run, userId, refundId);
    });

    res.status(201).json({
      success: true,
      data: { transaction: created },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/transactions/refunds/:transactionId
// :transactionId is the refund itself.
export const updateRefund = async (req, res, next) => {
  try {
    const { transactionId: refundId } = req.validated.params;
    const updates = req.validated.body;
    const userId = req.user.sub;

    const updated = await transaction(async (client) => {
      const run = (text, params) => client.query(text, params);

      const refund = await findTransaction(run, userId, refundId);

      if (!refund || refund.transaction_type !== "refund") {
        throw createError("Refund not found.", 404);
      }

      const entry = refund.entries[0];

      if (!entry) {
        throw createError("Refund has no account entry.", 409);
      }

      const pick = pickUpdate(updates);

      const final = {
        accountId: pick("account_id", entry.account_id),
        amountCents: pick("amount_cents", refund.amount_cents),
        date: pick("transaction_date", refund.transaction_date),
        description: pick("description", refund.description),
        notes: pick("notes", refund.notes),
      };

      if (updates.amount_cents !== undefined) {
        const expense = await findRefundableExpense(
          run,
          userId,
          refund.original_transaction_id,
        );

        // This refund's own amount is still counted in refunded_cents.
        assertWithinRefundable(
          final.amountCents,
          expense.amount_cents - expense.refunded_cents + refund.amount_cents,
        );
      }

      if (updates.account_id !== undefined) {
        await assertAccountUsable(run, userId, final.accountId);
      }

      await run(
        `
          UPDATE f_wallet.transactions
          SET
            amount_cents = $3,
            transaction_date = $4::date,
            effective_date = $4::date,
            description = $5,
            notes = $6,
            updated_at = DEFAULT
          WHERE transaction_id = $1
            AND user_id = $2
            AND status <> 'deleted'
        `,
        [
          refundId,
          userId,
          final.amountCents,
          final.date,
          final.description,
          final.notes,
        ],
      );

      await run(
        `
          UPDATE f_wallet.transaction_entries
          SET account_id = $3, amount_cents = $4
          WHERE entry_id = $1
            AND user_id = $2
        `,
        [entry.entry_id, userId, final.accountId, final.amountCents],
      );

      return findTransaction(run, userId, refundId);
    });

    res.status(200).json({
      success: true,
      data: { transaction: updated },
    });
  } catch (error) {
    next(error);
  }
};
