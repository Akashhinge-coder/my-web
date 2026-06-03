import { z } from "zod";

export const couponCreateSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()),
  type: z.enum(["flat", "percent"]),
  value: z.coerce.number().positive(),
  minOrder: z.coerce.number().nonnegative().default(0),
  maxDiscount: z.coerce.number().positive().optional().nullable(),
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const couponUpdateSchema = couponCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  orderAmount: z.coerce.number().nonnegative(),
  timestamp: z.string().datetime().optional(),
});

export type CouponCreateDTO = z.infer<typeof couponCreateSchema>;
export type CouponUpdateDTO = z.infer<typeof couponUpdateSchema>;
export type CouponValidateDTO = z.infer<typeof couponValidateSchema>;
