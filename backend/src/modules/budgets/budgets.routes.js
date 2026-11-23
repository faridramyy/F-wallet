import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";

import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  replaceBudgetAllocations,
  deleteBudget,
} from "./budgets.controller.js";

import {
  listBudgetsSchema,
  createBudgetSchema,
  updateBudgetSchema,
  budgetIdSchema,
  replaceAllocationsSchema,
} from "./budgets.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", validate(listBudgetsSchema), getBudgets);

router.post("/", validate(createBudgetSchema), createBudget);

router.get("/:budgetId", validate(budgetIdSchema), getBudget);

router.put(
  "/:budgetId/allocations",
  validate(replaceAllocationsSchema),
  replaceBudgetAllocations,
);

router.patch("/:budgetId", validate(updateBudgetSchema), updateBudget);

router.delete("/:budgetId", validate(budgetIdSchema), deleteBudget);

export default router;
