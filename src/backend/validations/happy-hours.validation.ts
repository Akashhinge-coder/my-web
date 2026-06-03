import { z } from "zod";

const daySchema = z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm time format");

const discountTypeSchema = z.enum(["flat", "percent"]);

export const happyHourCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  discountType: discountTypeSchema,
  discountValue: z.coerce.number().positive(),
  days: z.array(daySchema).min(1),
  startTime: timeSchema,
  endTime: timeSchema,
  isActive: z.boolean().optional().default(true),
  categoryIds: z.array(z.string().uuid()).optional().default([]),
  itemIds: z.array(z.string().uuid()).optional().default([]),
});

export const happyHourUpdateSchema = happyHourCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required"
);

export type HappyHourCreateDTO = z.infer<typeof happyHourCreateSchema>;
export type HappyHourUpdateDTO = z.infer<typeof happyHourUpdateSchema>;
