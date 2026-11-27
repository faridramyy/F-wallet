import { Router } from "express";

import requireAuth from "../../middleware/auth.js";
import validate from "../../middleware/validate.js";

import {
  getGroceries,
  createStore,
  updateStore,
  archiveStore,
  restoreStore,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
  createPrice,
  updatePrice,
  deletePrice,
} from "./groceries.controller.js";

import {
  createStoreSchema,
  updateStoreSchema,
  storeIdSchema,
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  createPriceSchema,
  updatePriceSchema,
  priceIdSchema,
} from "./groceries.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/", getGroceries);

router.post("/stores", validate(createStoreSchema), createStore);
router.patch("/stores/:storeId", validate(updateStoreSchema), updateStore);
router.delete("/stores/:storeId", validate(storeIdSchema), archiveStore);
router.post("/stores/:storeId/restore", validate(storeIdSchema), restoreStore);

router.post("/products", validate(createProductSchema), createProduct);
router.patch(
  "/products/:productId",
  validate(updateProductSchema),
  updateProduct,
);
router.delete(
  "/products/:productId",
  validate(productIdSchema),
  archiveProduct,
);
router.post(
  "/products/:productId/restore",
  validate(productIdSchema),
  restoreProduct,
);

router.post("/prices", validate(createPriceSchema), createPrice);
router.patch("/prices/:priceId", validate(updatePriceSchema), updatePrice);
router.delete("/prices/:priceId", validate(priceIdSchema), deletePrice);

export default router;
