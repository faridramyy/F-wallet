import { Router } from "express";

import healthRoutes from "../modules/health/health.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import settingsRoutes from "../modules/settings/settings.routes.js";
import accountsRoutes from "../modules/accounts/accounts.routes.js";
import categoriesRoutes from "../modules/categories/categories.routes.js";
import budgetsRoutes from "../modules/budgets/budgets.routes.js";
import transactionsRoutes from "../modules/transactions/transactions.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/users", usersRoutes);
router.use("/settings", settingsRoutes);
router.use("/accounts", accountsRoutes);
router.use("/categories", categoriesRoutes);
router.use("/budgets", budgetsRoutes);
router.use("/transactions", transactionsRoutes);

export default router;
