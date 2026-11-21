import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authenticateIdentity from "../../middleware/authenticate-identity.js";
import { getCurrentUser } from "./users.controller.js";

const router = Router();

router.get("/me", authenticate, authenticateIdentity, getCurrentUser);

export default router;
