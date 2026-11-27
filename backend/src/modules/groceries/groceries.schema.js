import { z } from "zod";

import { dateString } from "../transactions/transactions.schema.js";

// Which package units each kind of product may be priced in. Prices are
// compared per kg (weight), per L (volume) or per item (count).
export const UNIT_KINDS = {
  weight: ["g", "kg", "lb", "oz"],
  volume: ["ml", "l"],
  count: ["each"],
};

export const PACKAGE_UNITS = Object.values(UNIT_KINDS).flat();

export const unitKindOf = (packageUnit) =>
  Object.keys(UNIT_KINDS).find((kind) =>
    UNIT_KINDS[kind].includes(packageUnit),
  );

const uuidParam = (name) =>
  z.object({
    body: z.object({}),
    query: z.object({}),
    params: z.object({ [name]: z.string().uuid() }),
  });

const notEmpty = (data) => Object.keys(data).length > 0;

const optionalText = (max) => z.string().trim().max(max).nullable().optional();

// ---------------------------------------------------------------- stores

const storeFields = {
  store_name: z.string().trim().min(1).max(100),
  location: optionalText(150),
  notes: optionalText(2000),
};

export const createStoreSchema = z.object({
  body: z.object(storeFields).strict(),
  query: z.object({}),
  params: z.object({}),
});

export const updateStoreSchema = z.object({
  body: z
    .object(storeFields)
    .partial()
    .strict()
    .refine(notEmpty, { message: "At least one store field must be provided" }),
  query: z.object({}),
  params: z.object({ storeId: z.string().uuid() }),
});

export const storeIdSchema = uuidParam("storeId");

// -------------------------------------------------------------- products

const productFields = {
  product_name: z.string().trim().min(1).max(150),
  brand: optionalText(100),
  unit_kind: z.enum(Object.keys(UNIT_KINDS)),
  notes: optionalText(2000),
};

export const createProductSchema = z.object({
  body: z.object(productFields).strict(),
  query: z.object({}),
  params: z.object({}),
});

export const updateProductSchema = z.object({
  body: z.object(productFields).partial().strict().refine(notEmpty, {
    message: "At least one product field must be provided",
  }),
  query: z.object({}),
  params: z.object({ productId: z.string().uuid() }),
});

export const productIdSchema = uuidParam("productId");

// ---------------------------------------------------------------- prices

// numeric(10, 3): up to 7 digits before the point and 3 after.
const packageQuantity = z
  .number()
  .positive()
  .max(9_999_999.999)
  .refine(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6,
    "Use at most 3 decimal places",
  );

const priceFields = {
  product_id: z.string().uuid(),
  store_id: z.string().uuid(),
  // Money is always integer cents. 4.99 dollars is sent as 499.
  price_cents: z.number().int().safe().positive(),
  package_quantity: packageQuantity,
  package_unit: z.enum(PACKAGE_UNITS),
  is_sale: z.boolean().optional(),
  observed_on: dateString,
  notes: optionalText(2000),
};

export const createPriceSchema = z.object({
  body: z.object(priceFields).strict(),
  query: z.object({}),
  params: z.object({}),
});

export const updatePriceSchema = z.object({
  body: z
    .object(priceFields)
    .partial()
    .strict()
    .refine(notEmpty, { message: "At least one price field must be provided" }),
  query: z.object({}),
  params: z.object({ priceId: z.string().uuid() }),
});

export const priceIdSchema = uuidParam("priceId");
