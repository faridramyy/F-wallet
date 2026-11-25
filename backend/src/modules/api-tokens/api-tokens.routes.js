import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";

import {
  createApiToken,
  getApiTokens,
  revokeApiToken,
} from "./api-tokens.controller.js";
import { apiTokenIdSchema, createApiTokenSchema } from "./api-tokens.schema.js";

const router = Router();

// Managing tokens needs a real sign-in: a token cannot create or revoke
// tokens.
router.use(requireAuth);

router.get("/", getApiTokens);
router.post("/", validate(createApiTokenSchema), createApiToken);
router.delete("/:apiTokenId", validate(apiTokenIdSchema), revokeApiToken);

export default router;
