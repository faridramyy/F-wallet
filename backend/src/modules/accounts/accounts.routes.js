import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";

import {
  getAccounts,
  getArchivedAccounts,
  getAccount,
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
  reorderAccounts,
} from "./accounts.controller.js";

import {
  createAccountSchema,
  updateAccountSchema,
  accountIdSchema,
  reorderAccountsSchema,
} from "./accounts.schema.js";

const router = Router();

router.use(requireAuth);
router.get("/", getAccounts);
router.get("/archived", getArchivedAccounts);
router.post("/", validate(createAccountSchema), createAccount);

// Register this BEFORE /:accountId.
router.patch("/order", validate(reorderAccountsSchema), reorderAccounts);

router.get("/:accountId", validate(accountIdSchema), getAccount);

router.post("/:accountId/restore", validate(accountIdSchema), restoreAccount);

router.patch("/:accountId", validate(updateAccountSchema), updateAccount);
router.delete("/:accountId", validate(accountIdSchema), archiveAccount);

export default router;
