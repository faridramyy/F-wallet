import { z } from "zod";

const budgetFields = {
  budget_year: z.number().int().min(2000).max(9999),

  budget_month: z.number().int().min(1).max(12),

  name: z.string().trim().max(100).nullable().optional(),
};

const allocationSchema = z
  .object({
    category_id: z.string().uuid(),

    allocated_cents: z.number().int().safe().nonnegative(),
  })
  .strict();

export const listBudgetsSchema = z.object({
  body: z.object({}),

  query: z
    .object({
      year: z.coerce.number().int().min(2000).max(9999).optional(),
    })
    .strict(),

  params: z.object({}),
});

export const createBudgetSchema = z.object({
  body: z.object(budgetFields).strict(),

  query: z.object({}),

  params: z.object({}),
});

export const updateBudgetSchema = z.object({
  body: z
    .object(budgetFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one budget field must be provided",
    }),

  query: z.object({}),

  params: z.object({
    budgetId: z.string().uuid(),
  }),
});

export const budgetIdSchema = z.object({
  body: z.object({}),

  query: z.object({}),

  params: z.object({
    budgetId: z.string().uuid(),
  }),
});

export const replaceAllocationsSchema = z.object({
  body: z
    .object({
      allocations: z.array(allocationSchema),
    })
    .strict()
    .refine(
      (data) =>
        new Set(data.allocations.map((item) => item.category_id)).size ===
        data.allocations.length,
      {
        message: "A category can only appear once in a budget",
      },
    ),

  query: z.object({}),

  params: z.object({
    budgetId: z.string().uuid(),
  }),
});
