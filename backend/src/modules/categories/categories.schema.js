import { z } from "zod";

const categoryFields = {
  category_name: z.string().trim().min(1).max(100),

  category_type: z.enum(["income", "expense"]),

  parent_category_id: z.string().uuid().nullable().optional(),

  default_account_id: z.string().uuid().nullable().optional(),

  notes: z.string().nullable().optional(),
};

export const createCategorySchema = z.object({
  body: z.object(categoryFields).strict(),

  query: z.object({}),

  params: z.object({}),
});

export const updateCategorySchema = z.object({
  body: z
    .object(categoryFields)
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one category field must be provided",
    }),

  query: z.object({}),

  params: z.object({
    categoryId: z.string().uuid(),
  }),
});

export const categoryIdSchema = z.object({
  body: z.object({}),

  query: z.object({}),

  params: z.object({
    categoryId: z.string().uuid(),
  }),
});

export const reorderCategoriesSchema = z.object({
  body: z
    .object({
      category_ids: z.array(z.string().uuid()).min(1),
    })
    .strict(),

  query: z.object({}),

  params: z.object({}),
});
