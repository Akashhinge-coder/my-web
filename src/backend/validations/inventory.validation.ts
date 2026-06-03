import { z } from "zod";

const unitSchema = z.enum(["kg", "g", "L", "ml", "pcs", "dozen", "bag", "bottle", "box"]);

export const createInventorySchema = z.object({
  ingredient_name: z.string().trim().min(1, "Ingredient name is required"),
  unit: unitSchema.default("kg"),
  current_qty: z.coerce.number().nonnegative().default(0),
  low_stock_alert: z.coerce.number().nonnegative().default(1),
});

export const updateInventorySchema = z
  .object({
    ingredient_name: z.string().trim().min(1).optional(),
    unit: unitSchema.optional(),
    current_qty: z.coerce.number().nonnegative().optional(),
    low_stock_alert: z.coerce.number().nonnegative().optional(),
    delta: z.coerce.number().optional(),
  })
  .refine(
    (value) =>
      value.delta !== undefined ||
      value.ingredient_name !== undefined ||
      value.unit !== undefined ||
      value.current_qty !== undefined ||
      value.low_stock_alert !== undefined,
    { message: "At least one field is required" }
  );

export type CreateInventoryDTO = z.infer<typeof createInventorySchema>;
export type UpdateInventoryDTO = z.infer<typeof updateInventorySchema>;
