import { randomUUID } from "node:crypto";

import { query } from "../../database/db.js";
import { conflictOnDuplicate, createError } from "../../utils/http-error.js";
import { pickUpdate } from "../../utils/patch.js";
import { upsertUser } from "../users/users.service.js";
import { UNIT_KINDS, unitKindOf } from "./groceries.schema.js";

const storeColumns = `
  store_id,
  store_name,
  location,
  notes,
  is_archived,
  archived_at,
  created_at,
  updated_at
`;

const productColumns = `
  product_id,
  product_name,
  brand,
  unit_kind,
  notes,
  is_archived,
  archived_at,
  created_at,
  updated_at
`;

const priceColumns = `
  price_id,
  product_id,
  store_id,
  price_cents,
  package_quantity,
  package_unit,
  is_sale,
  observed_on::text AS observed_on,
  notes,
  created_at,
  updated_at
`;

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

// GET /api/v1/groceries
//
// Everything the Groceries page needs in one response: stores, products
// (active and archived, so old prices still have a name) and the whole
// price log, newest first. The client works out unit and best prices.
export const getGroceries = async (req, res, next) => {
  try {
    const userId = req.user.sub;

    const [stores, products, prices] = await Promise.all([
      query(
        `
          SELECT ${storeColumns}
          FROM f_wallet.grocery_stores
          WHERE user_id = $1
          ORDER BY store_name ASC
        `,
        [userId],
      ),
      query(
        `
          SELECT ${productColumns}
          FROM f_wallet.grocery_products
          WHERE user_id = $1
          ORDER BY product_name ASC, brand ASC NULLS FIRST
        `,
        [userId],
      ),
      query(
        `
          SELECT ${priceColumns}
          FROM f_wallet.grocery_prices
          WHERE user_id = $1
          ORDER BY observed_on DESC, created_at DESC
        `,
        [userId],
      ),
    ]);

    ok(res, {
      stores: stores.rows,
      products: products.rows,
      prices: prices.rows,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------- archive and restore

// Stores and products are archived, never deleted, so their prices keep
// pointing at something. Archived ones can't get new prices.
const archiveHandlers = ({ table, idColumn, param, columns, key, noun }) => {
  const setArchived = (archived) => async (req, res, next) => {
    try {
      const result = await query(
        `
          UPDATE f_wallet.${table}
          SET
            is_archived = $3,
            archived_at = ${archived ? "NOW()" : "NULL"},
            updated_at = DEFAULT
          WHERE ${idColumn} = $1
            AND user_id = $2
            AND is_archived = $4
          RETURNING ${columns}
        `,
        [req.validated.params[param], req.user.sub, archived, !archived],
      );

      if (result.rowCount === 0) {
        return next(createError(`${noun} not found.`, 404));
      }

      ok(res, { [key]: result.rows[0] });
    } catch (error) {
      next(error);
    }
  };

  return { archive: setArchived(true), restore: setArchived(false) };
};

// ---------------------------------------------------------------- stores

const storeConflict = conflictOnDuplicate(
  "You already have a store with this name.",
);

// POST /api/v1/groceries/stores
export const createStore = async (req, res, next) => {
  try {
    const data = req.validated.body;

    await upsertUser(req.user);

    const result = await query(
      `
        INSERT INTO f_wallet.grocery_stores (
          store_id, user_id, store_name, location, notes
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${storeColumns}
      `,
      [
        randomUUID(),
        req.user.sub,
        data.store_name,
        data.location || null,
        data.notes || null,
      ],
    );

    ok(res, { store: result.rows[0] }, 201);
  } catch (error) {
    storeConflict(error, next);
  }
};

// PATCH /api/v1/groceries/stores/:storeId
export const updateStore = async (req, res, next) => {
  try {
    const { storeId } = req.validated.params;
    const pick = pickUpdate(req.validated.body);

    const existing = await query(
      `
        SELECT ${storeColumns}
        FROM f_wallet.grocery_stores
        WHERE store_id = $1 AND user_id = $2
      `,
      [storeId, req.user.sub],
    );

    if (existing.rowCount === 0) {
      return next(createError("Store not found.", 404));
    }

    const store = existing.rows[0];

    const result = await query(
      `
        UPDATE f_wallet.grocery_stores
        SET
          store_name = $3,
          location = $4,
          notes = $5,
          updated_at = DEFAULT
        WHERE store_id = $1 AND user_id = $2
        RETURNING ${storeColumns}
      `,
      [
        storeId,
        req.user.sub,
        pick("store_name", store.store_name),
        pick("location", store.location) || null,
        pick("notes", store.notes) || null,
      ],
    );

    ok(res, { store: result.rows[0] });
  } catch (error) {
    storeConflict(error, next);
  }
};

const storeArchive = archiveHandlers({
  table: "grocery_stores",
  idColumn: "store_id",
  param: "storeId",
  columns: storeColumns,
  key: "store",
  noun: "Store",
});

// DELETE /api/v1/groceries/stores/:storeId
export const archiveStore = storeArchive.archive;

// POST /api/v1/groceries/stores/:storeId/restore
export const restoreStore = storeArchive.restore;

// -------------------------------------------------------------- products

const productConflict = conflictOnDuplicate("You already have this product.");

// The unique (user, name, brand) constraint lets two products with the same
// name and no brand through, because NULLs never clash. Catch that here.
const assertNoUnbrandedTwin = async ({ userId, name, brand, exceptId }) => {
  if (brand) return;

  const result = await query(
    `
      SELECT 1
      FROM f_wallet.grocery_products
      WHERE user_id = $1
        AND product_name = $2
        AND brand IS NULL
        AND product_id IS DISTINCT FROM $3
      LIMIT 1
    `,
    [userId, name, exceptId ?? null],
  );

  if (result.rowCount > 0) {
    throw createError("You already have this product.", 409);
  }
};

// POST /api/v1/groceries/products
export const createProduct = async (req, res, next) => {
  try {
    const data = req.validated.body;
    const brand = data.brand || null;

    await upsertUser(req.user);
    await assertNoUnbrandedTwin({
      userId: req.user.sub,
      name: data.product_name,
      brand,
    });

    const result = await query(
      `
        INSERT INTO f_wallet.grocery_products (
          product_id, user_id, product_name, brand, unit_kind, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${productColumns}
      `,
      [
        randomUUID(),
        req.user.sub,
        data.product_name,
        brand,
        data.unit_kind,
        data.notes || null,
      ],
    );

    ok(res, { product: result.rows[0] }, 201);
  } catch (error) {
    productConflict(error, next);
  }
};

// PATCH /api/v1/groceries/products/:productId
export const updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.validated.params;
    const userId = req.user.sub;
    const pick = pickUpdate(req.validated.body);

    const existing = await query(
      `
        SELECT ${productColumns}
        FROM f_wallet.grocery_products
        WHERE product_id = $1 AND user_id = $2
      `,
      [productId, userId],
    );

    if (existing.rowCount === 0) {
      return next(createError("Product not found.", 404));
    }

    const product = existing.rows[0];
    const name = pick("product_name", product.product_name);
    const brand = pick("brand", product.brand) || null;
    const unitKind = pick("unit_kind", product.unit_kind);

    await assertNoUnbrandedTwin({ userId, name, brand, exceptId: productId });

    // Every logged price must stay comparable, so the kind can only change
    // while no price uses a unit of the old kind.
    if (unitKind !== product.unit_kind) {
      const priced = await query(
        `
          SELECT 1
          FROM f_wallet.grocery_prices
          WHERE user_id = $1
            AND product_id = $2
            AND package_unit <> ALL ($3::varchar[])
          LIMIT 1
        `,
        [userId, productId, UNIT_KINDS[unitKind]],
      );

      if (priced.rowCount > 0) {
        return next(
          createError(
            "This product already has prices in other units, so its unit type can't change.",
            409,
          ),
        );
      }
    }

    const result = await query(
      `
        UPDATE f_wallet.grocery_products
        SET
          product_name = $3,
          brand = $4,
          unit_kind = $5,
          notes = $6,
          updated_at = DEFAULT
        WHERE product_id = $1 AND user_id = $2
        RETURNING ${productColumns}
      `,
      [
        productId,
        userId,
        name,
        brand,
        unitKind,
        pick("notes", product.notes) || null,
      ],
    );

    ok(res, { product: result.rows[0] });
  } catch (error) {
    productConflict(error, next);
  }
};

const productArchive = archiveHandlers({
  table: "grocery_products",
  idColumn: "product_id",
  param: "productId",
  columns: productColumns,
  key: "product",
  noun: "Product",
});

// DELETE /api/v1/groceries/products/:productId
export const archiveProduct = productArchive.archive;

// POST /api/v1/groceries/products/:productId/restore
export const restoreProduct = productArchive.restore;

// ---------------------------------------------------------------- prices

// Checks that the product and store exist, are active, and that the package
// unit suits the product (no "kg" for a product counted in items).
const assertPriceTargets = async ({
  userId,
  productId,
  storeId,
  packageUnit,
}) => {
  const [product, store] = await Promise.all([
    query(
      `
        SELECT unit_kind
        FROM f_wallet.grocery_products
        WHERE product_id = $1 AND user_id = $2 AND is_archived = FALSE
      `,
      [productId, userId],
    ),
    query(
      `
        SELECT 1
        FROM f_wallet.grocery_stores
        WHERE store_id = $1 AND user_id = $2 AND is_archived = FALSE
      `,
      [storeId, userId],
    ),
  ]);

  if (product.rowCount === 0) {
    throw createError("Product not found.", 404);
  }

  if (store.rowCount === 0) {
    throw createError("Store not found.", 404);
  }

  const unitKind = product.rows[0].unit_kind;

  if (unitKindOf(packageUnit) !== unitKind) {
    throw createError(
      `This product is measured by ${unitKind}; use ${UNIT_KINDS[unitKind].join(", ")}.`,
      400,
    );
  }
};

// POST /api/v1/groceries/prices
export const createPrice = async (req, res, next) => {
  try {
    const data = req.validated.body;
    const userId = req.user.sub;

    await assertPriceTargets({
      userId,
      productId: data.product_id,
      storeId: data.store_id,
      packageUnit: data.package_unit,
    });

    const result = await query(
      `
        INSERT INTO f_wallet.grocery_prices (
          price_id, user_id, product_id, store_id, price_cents,
          package_quantity, package_unit, is_sale, observed_on, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING ${priceColumns}
      `,
      [
        randomUUID(),
        userId,
        data.product_id,
        data.store_id,
        data.price_cents,
        data.package_quantity,
        data.package_unit,
        data.is_sale ?? false,
        data.observed_on,
        data.notes || null,
      ],
    );

    ok(res, { price: result.rows[0] }, 201);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/groceries/prices/:priceId
export const updatePrice = async (req, res, next) => {
  try {
    const { priceId } = req.validated.params;
    const userId = req.user.sub;
    const updates = req.validated.body;
    const pick = pickUpdate(updates);

    const existing = await query(
      `
        SELECT ${priceColumns}
        FROM f_wallet.grocery_prices
        WHERE price_id = $1 AND user_id = $2
      `,
      [priceId, userId],
    );

    if (existing.rowCount === 0) {
      return next(createError("Price not found.", 404));
    }

    const price = existing.rows[0];
    const productId = pick("product_id", price.product_id);
    const storeId = pick("store_id", price.store_id);
    const packageUnit = pick("package_unit", price.package_unit);

    // Re-check only when what the check covers changed, so a price for a
    // product that was archived later can still have its notes fixed.
    if (
      updates.product_id !== undefined ||
      updates.store_id !== undefined ||
      updates.package_unit !== undefined
    ) {
      await assertPriceTargets({ userId, productId, storeId, packageUnit });
    }

    const result = await query(
      `
        UPDATE f_wallet.grocery_prices
        SET
          product_id = $3,
          store_id = $4,
          price_cents = $5,
          package_quantity = $6,
          package_unit = $7,
          is_sale = $8,
          observed_on = $9,
          notes = $10,
          updated_at = DEFAULT
        WHERE price_id = $1 AND user_id = $2
        RETURNING ${priceColumns}
      `,
      [
        priceId,
        userId,
        productId,
        storeId,
        pick("price_cents", price.price_cents),
        pick("package_quantity", price.package_quantity),
        packageUnit,
        pick("is_sale", price.is_sale),
        pick("observed_on", price.observed_on),
        pick("notes", price.notes) || null,
      ],
    );

    ok(res, { price: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/groceries/prices/:priceId
// A price is a single log entry, so it is deleted outright.
export const deletePrice = async (req, res, next) => {
  try {
    const result = await query(
      `
        DELETE FROM f_wallet.grocery_prices
        WHERE price_id = $1 AND user_id = $2
      `,
      [req.validated.params.priceId, req.user.sub],
    );

    if (result.rowCount === 0) {
      return next(createError("Price not found.", 404));
    }

    ok(res, {});
  } catch (error) {
    next(error);
  }
};
