import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authenticateIdentity from "../../middleware/authenticate-identity.js";
import validate from "../../middleware/validate.js";

import { getSettings, updateSettings } from "./settings.controller.js";

import { updateSettingsSchema } from "./settings.schema.js";

const router = Router();

router.use(authenticate, authenticateIdentity);

router.get("/", getSettings);

router.patch("/", validate(updateSettingsSchema), updateSettings);

export default router;
