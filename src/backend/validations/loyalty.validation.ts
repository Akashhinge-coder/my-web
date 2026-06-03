import { z } from "zod";

const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number");

export const loyaltyRedeemSchema = z.object({
  phone: phoneSchema,
  orderAmount: z.coerce.number().nonnegative(),
  pointsToRedeem: z.coerce.number().int().positive(),
  commit: z.boolean().optional().default(false),
});

export type LoyaltyRedeemDTO = z.infer<typeof loyaltyRedeemSchema>;
