import { Router } from "express";
import {
  getHealth,
  getDatabaseHealth,
  getAuthHealth,
} from "./health.controller.js";
import requireAuth from "../../middleware/auth.js";

const router = Router();

router.get("/", getHealth);
router.get("/db", getDatabaseHealth);
// Checks that the caller's Cognito tokens are accepted.
router.get("/auth", requireAuth, getAuthHealth);

export default router;
