import { z } from "zod";

const TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
  "refund",
  "adjustment",
];

// "2026-11-22" and nothing else. We also check the date really exists,
// because the regex alone would accept "2026-02-31".
const isRealDate = (value) => {
  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine(isRealDate, "Enter a real calendar date");

// Only income and expense can be created or edited through this API for now.
// Transfers (two accounts) and refunds (point at an original transaction)
// need their own endpoints.
const transactionFields = {
  transaction_type: z.enum(["income", "expense"]),

  account_id: z.string().uuid(),

  category_id: z.string().uuid().nullable().optional(),

  // Money is always integer cents. 19.99 dollars is sent as 1999.
  amount_cents: z.number().int().safe().positive(),

  transaction_date: dateString,

  description: z.string().trim().max(255).nullable().optional(),

  merchant: z.string().trim().max(150).nullable().optional(),

  notes: z.string().nullable().optional(),
};

export const listTransactionsSchema = z.object({
  body: z.object({}),

  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      account_id: z.string().uuid().optional(),
      category_id: z.string().uuid().optional(),
      transaction_type: z.enum(TRANSACTION_TYPES).optional(),
      from: dateString.optional(),
      to: dateString.optional(),
    })
    .strict()
    .refine((data) => !data.from || !data.to || data.from <= data.to, {
      message: "'from' must be on or before 'to'",
    }),

  params: z.object({}),
});

export const createTransactionSchema = z.object({
  body: z.object(transactionFields).strict(),

  query: z.object({}),
  params: z.object({}),
});

export const updateTransactionSchema = z.object({
  body: z
    .object(transactionFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one transaction field must be provided",
    }),

  query: z.object({}),

  params: z.object({
    transactionId: z.string().uuid(),
  }),
});

export const transactionIdSchema = z.object({
  body: z.object({}),

  query: z.object({}),

  params: z.object({
    transactionId: z.string().uuid(),
  }),
});
