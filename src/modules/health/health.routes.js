import { Router } from "express";
import { getHealth, getDatabaseHealth } from "./health.controller.js";

const router = Router();

router.get("/", getHealth);
router.get("/db", getDatabaseHealth);

export default router;
