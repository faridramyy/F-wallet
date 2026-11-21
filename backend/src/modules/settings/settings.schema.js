import { z } from "zod";

const settingsFields = {
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional(),

  timezone: z.string().min(1).max(100).optional(),

  date_format: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).optional(),

  theme: z.enum(["light", "dark", "system"]).optional(),

  notify_recurring_reminders: z.boolean().optional(),
  notify_budget_thresholds: z.boolean().optional(),
  notify_apple_pay_failures: z.boolean().optional(),
  notify_unknown_cards: z.boolean().optional(),
  notify_unmatched_accounts: z.boolean().optional(),
  notify_monthly_reports: z.boolean().optional(),

  recurring_generation_window_days: z.number().int().min(1).max(90).optional(),
};

export const updateSettingsSchema = z.object({
  body: z
    .object(settingsFields)
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one setting must be provided",
    }),
  query: z.object({}),
  params: z.object({}),
});
