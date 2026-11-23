import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";

import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transactions.controller.js";

import {
  listTransactionsSchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdSchema,
} from "./transactions.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listTransactionsSchema), getTransactions);
router.post("/", validate(createTransactionSchema), createTransaction);

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
