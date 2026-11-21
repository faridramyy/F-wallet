import { Router } from "express";

import healthRoutes from "../modules/health/health.routes.js";
import usersRoutes from "../modules/users/users.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/users", usersRoutes);

export default router;
