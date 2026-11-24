import { randomUUID } from "node:crypto";

import { transaction } from "../../database/db.js";
import { createError } from "../../utils/http-error.js";
import { pickUpdate } from "../../utils/patch.js";
import {
  assertAccountUsable,
  findTransaction,
  insertEntry,
} from "./transactions.controller.js";

// A transfer moves money between two of the user's own accounts. It is one
// transaction row (type "transfer", no category) linked to a transfer_groups
// row that names both accounts, with two ledger entries:
//   source       -amount  (money leaves)
//   destination  +amount  (money arrives; paying a credit card lowers its debt)
// Transfers are not income or spending, so reports leave them out.

// POST /api/v1/transactions/transfers
export const createTransfer = async (req, res, next) => {
  try {
    const data = req.validated.body;
    const userId = req.user.sub;
    const transactionId = randomUUID();
    const transferGroupId = randomUUID();

    const created = await transaction(async (client) => {
      const run = (text, params) => client.query(text, params);

      await assertAccountUsable(run, userId, data.from_account_id);
      await assertAccountUsable(run, userId, data.to_account_id);

      await run(
        `
          INSERT INTO f_wallet.transfer_groups (
            transfer_group_id,
            user_id,
            source_account_id,
            destination_account_id
          )
          VALUES ($1, $2, $3, $4)
        `,
        [transferGroupId, userId, data.from_account_id, data.to_account_id],
      );

      await run(
        `
          INSERT INTO f_wallet.transactions (
            transaction_id,
            user_id,
            transfer_group_id,
            transaction_type,
            status,
            amount_cents,
            transaction_date,
            effective_date,
            description,
            source,
            notes
          )
          VALUES (
            $1, $2, $3, 'transfer', 'posted', $4, $5::date, $5::date,
            $6, 'manual', $7
          )
        `,
        [
          transactionId,
          userId,
          transferGroupId,
          data.amount_cents,
          data.transaction_date,
          data.description ?? null,
          data.notes ?? null,
        ],
      );

      await insertEntry(run, userId, {
        transactionId,
        accountId: data.from_account_id,
        role: "source",
        amountCents: -data.amount_cents,
      });

      await insertEntry(run, userId, {
        transactionId,
        accountId: data.to_account_id,
        role: "destination",
        amountCents: data.amount_cents,
      });

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

// PATCH /api/v1/transactions/transfers/:transactionId
export const updateTransfer = async (req, res, next) => {
  try {
    const { transactionId } = req.validated.params;
    const updates = req.validated.body;
    const userId = req.user.sub;

    const updated = await transaction(async (client) => {
      const run = (text, params) => client.query(text, params);

      const existing = await findTransaction(run, userId, transactionId);

      if (!existing || existing.transaction_type !== "transfer") {
        throw createError("Transfer not found.", 404);
      }

      const source = existing.entries.find((e) => e.entry_role === "source");
      const destination = existing.entries.find(
        (e) => e.entry_role === "destination",
      );

      if (!source || !destination) {
        throw createError("Transfer is missing an account entry.", 409);
      }

      const pick = pickUpdate(updates);

      const final = {
        fromAccountId: pick("from_account_id", source.account_id),
        toAccountId: pick("to_account_id", destination.account_id),
        amountCents: pick("amount_cents", existing.amount_cents),
        date: pick("transaction_date", existing.transaction_date),
        description: pick("description", existing.description),
        notes: pick("notes", existing.notes),
      };

      if (final.fromAccountId === final.toAccountId) {
        throw createError("Choose two different accounts.", 400);
      }

      // Only re-validate accounts that changed, so a transfer from an account
      // archived later can still be edited.
      if (updates.from_account_id !== undefined) {
        await assertAccountUsable(run, userId, final.fromAccountId);
      }
      if (updates.to_account_id !== undefined) {
        await assertAccountUsable(run, userId, final.toAccountId);
      }

      await run(
        `
          UPDATE f_wallet.transfer_groups
          SET
            source_account_id = $3,
            destination_account_id = $4,
            updated_at = DEFAULT
          WHERE transfer_group_id = $1
            AND user_id = $2
        `,
        [
          existing.transfer_group_id,
          userId,
          final.fromAccountId,
          final.toAccountId,
        ],
      );

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
          transactionId,
          userId,
          final.amountCents,
          final.date,
          final.description,
          final.notes,
        ],
      );

      const updateEntry = (entryId, accountId, amountCents) =>
        run(
          `
            UPDATE f_wallet.transaction_entries
            SET account_id = $3, amount_cents = $4
            WHERE entry_id = $1
              AND user_id = $2
          `,
          [entryId, userId, accountId, amountCents],
        );

      await updateEntry(
        source.entry_id,
        final.fromAccountId,
        -final.amountCents,
      );
      await updateEntry(
        destination.entry_id,
        final.toAccountId,
        final.amountCents,
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
