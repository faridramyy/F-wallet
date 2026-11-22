import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authenticateIdentity from "../../middleware/authenticate-identity.js";
import validate from "../../middleware/validate.js";

import {
  getCategories,
  getArchivedCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  reorderCategories,
} from "./categories.controller.js";

import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdSchema,
  reorderCategoriesSchema,
} from "./categories.schema.js";

const router = Router();

router.use(authenticate, authenticateIdentity);

router.get("/", getCategories);
router.get("/archived", getArchivedCategories);
router.post("/", validate(createCategorySchema), createCategory);

// Register this BEFORE /:categoryId.
router.patch("/order", validate(reorderCategoriesSchema), reorderCategories);

router.get("/:categoryId", validate(categoryIdSchema), getCategory);

router.post(
  "/:categoryId/restore",
  validate(categoryIdSchema),
  restoreCategory,
);

router.patch("/:categoryId", validate(updateCategorySchema), updateCategory);

router.delete("/:categoryId", validate(categoryIdSchema), archiveCategory);

export default router;
