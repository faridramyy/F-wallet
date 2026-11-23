import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authenticateIdentity from "../../middleware/authenticate-identity.js";
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

router.use(authenticate, authenticateIdentity);

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
