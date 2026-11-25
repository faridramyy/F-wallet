import { z } from "zod";

// How long a new token lasts: 30, 90 or 365 days, or null for no expiry.
const TOKEN_LIFETIMES_DAYS = [30, 90, 365];

export const createApiTokenSchema = z.object({
  body: z
    .object({
      token_name: z.string().trim().min(1, "Give the token a name").max(100),
      expires_in_days: z
        .union([
          z.literal(TOKEN_LIFETIMES_DAYS[0]),
          z.literal(TOKEN_LIFETIMES_DAYS[1]),
          z.literal(TOKEN_LIFETIMES_DAYS[2]),
        ])
        .nullable(),
    })
    .strict(),
  query: z.object({}),
  params: z.object({}),
});

export const apiTokenIdSchema = z.object({
  body: z.object({}),
  query: z.object({}),
  params: z.object({
    apiTokenId: z.string().uuid(),
  }),
});
