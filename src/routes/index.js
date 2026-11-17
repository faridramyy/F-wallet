import { Router } from "express";

import v1Routes from "./v1.routes.js";

const router = Router();

// API version 1
router.use("/v1", v1Routes);

export default router;
