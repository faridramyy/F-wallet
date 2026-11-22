import { z } from "zod";

const accountFields = {
  account_name: z.string().trim().min(1).max(100),

  account_type: z.enum(["checking", "savings", "credit_card", "cash"]),

  institution_name: z.string().max(100).nullable().optional(),

  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional(),

  opening_balance_cents: z.number().int().safe().optional(),

  credit_limit_cents: z.number().int().safe().min(0).nullable().optional(),

  card_last_four: z
    .string()
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),

  statement_closing_day: z.number().int().min(1).max(31).nullable().optional(),

  payment_due_day: z.number().int().min(1).max(31).nullable().optional(),

  include_in_net_worth: z.boolean().optional(),

  notes: z.string().nullable().optional(),
};

const creditCardFields = [
  "credit_limit_cents",
  "card_last_four",
  "statement_closing_day",
  "payment_due_day",
];

const validateCreditCardFields = (data, ctx) => {
  if (data.account_type !== undefined && data.account_type !== "credit_card") {
    for (const field of creditCardFields) {
      if (data[field] != null) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is only allowed for credit card accounts`,
        });
      }
    }
  }
};

export const createAccountSchema = z.object({
  body: z.object(accountFields).strict().superRefine(validateCreditCardFields),

  query: z.object({}),
  params: z.object({}),
});

export const updateAccountSchema = z.object({
  body: z
    .object(accountFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one account field must be provided",
    })
    .superRefine(validateCreditCardFields),

  query: z.object({}),

  params: z.object({
    accountId: z.string().uuid(),
  }),
});

export const accountIdSchema = z.object({
  body: z.object({}),

  query: z.object({}),

  params: z.object({
    accountId: z.string().uuid(),
  }),
});

export const reorderAccountsSchema = z.object({
  body: z
    .object({
      account_ids: z.array(z.string().uuid()).min(1),
    })
    .strict(),

  query: z.object({}),

  params: z.object({}),
});
