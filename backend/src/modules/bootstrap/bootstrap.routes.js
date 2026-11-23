import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authenticateIdentity from "../../middleware/authenticate-identity.js";
import { getBootstrap } from "./bootstrap.controller.js";

const router = Router();

router.get("/", authenticate, authenticateIdentity, getBootstrap);

export default router;
