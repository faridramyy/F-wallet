import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";

import { getSettings, updateSettings } from "./settings.controller.js";

import { updateSettingsSchema } from "./settings.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", getSettings);

router.patch("/", validate(updateSettingsSchema), updateSettings);

export default router;
