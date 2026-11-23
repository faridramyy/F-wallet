import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import { getBootstrap } from "./bootstrap.controller.js";

const router = Router();

router.get("/", requireAuth, getBootstrap);

export default router;
