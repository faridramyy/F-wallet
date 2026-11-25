import { Router } from "express";

import requireAuth, { allowApiToken } from "../../middleware/auth.js";
import idempotency from "../../middleware/idempotency.js";
import validate from "../../middleware/validate.js";

import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transactions.controller.js";
import { createTransfer, updateTransfer } from "./transfers.controller.js";
import { createRefund, updateRefund } from "./refunds.controller.js";

import {
  listTransactionsSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdSchema,
  createTransferSchema,
  updateTransferSchema,
  createRefundSchema,
  updateRefundSchema,
} from "./transactions.schema.js";

const router = Router();

// Adding an income or expense also works with a personal API token (e.g. an
// iPhone Shortcut). Token requests may send an Idempotency-Key header so a
// retry cannot create a duplicate.
router.post(
  "/",
  allowApiToken,
  idempotency,
  validate(createTransactionSchema),
  createTransaction,
);

// Everything else needs a real sign-in.
router.use(requireAuth);

router.get("/", validate(listTransactionsSchema), getTransactions);

// Transfers between the user's own accounts.
router.post("/transfers", validate(createTransferSchema), createTransfer);
router.patch(
  "/transfers/:transactionId",
  validate(updateTransferSchema),
  updateTransfer,
);

// Refunds: created on an expense, edited by their own id.
router.post(
  "/:transactionId/refunds",
  validate(createRefundSchema),
  createRefund,
);
router.patch(
  "/refunds/:transactionId",
  validate(updateRefundSchema),
  updateRefund,
);

router.get("/:transactionId", validate(transactionIdSchema), getTransaction);

router.patch(
  "/:transactionId",
  validate(updateTransactionSchema),
  updateTransaction,
);

router.delete(
  "/:transactionId",
  validate(transactionIdSchema),
  deleteTransaction,
);

export default router;
