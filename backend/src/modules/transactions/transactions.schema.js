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

// ---------------------------------------------------------------------------
// Transfers: money moving between two of the user's own accounts.

const amountCents = z.number().int().safe().positive();
const optionalText = (max) => z.string().trim().max(max).nullable().optional();

const transferFields = {
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount_cents: amountCents,
  transaction_date: dateString,
  description: optionalText(255),
  notes: z.string().nullable().optional(),
};

const differentAccounts = (data) =>
  !data.from_account_id ||
  !data.to_account_id ||
  data.from_account_id !== data.to_account_id;

const differentAccountsError = {
  message: "Choose two different accounts",
  path: ["to_account_id"],
};

const transactionIdParams = z.object({
  transactionId: z.string().uuid(),
});

export const createTransferSchema = z.object({
  body: z
    .object(transferFields)
    .strict()
    .refine(differentAccounts, differentAccountsError),
  query: z.object({}),
  params: z.object({}),
});

export const updateTransferSchema = z.object({
  body: z
    .object(transferFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one transfer field must be provided",
    })
    .refine(differentAccounts, differentAccountsError),
  query: z.object({}),
  params: transactionIdParams,
});

// ---------------------------------------------------------------------------
// Refunds: money returned for an expense. The expense is the URL's
// :transactionId when creating; the refund's own id when editing.

const refundFields = {
  // Defaults to the account the expense was paid from.
  account_id: z.string().uuid().optional(),
  amount_cents: amountCents,
  transaction_date: dateString,
  description: optionalText(255),
  notes: z.string().nullable().optional(),
};

export const createRefundSchema = z.object({
  body: z.object(refundFields).strict(),
  query: z.object({}),
  params: transactionIdParams,
});

export const updateRefundSchema = z.object({
  body: z
    .object(refundFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one refund field must be provided",
    }),
  query: z.object({}),
  params: transactionIdParams,
});
