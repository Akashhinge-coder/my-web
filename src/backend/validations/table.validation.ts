import { z } from "zod";

export const createTableSchema = z.object({
  table_number: z.string().trim().min(1, "Table number is required"),
  seating_capacity: z.coerce.number().int().positive(),
  table_type: z.enum(["regular", "booth", "outdoor", "private"]).default("regular"),
  floor: z.string().optional().nullable(),
});

export const updateTableStatusSchema = z.object({
  status: z.enum(["available", "occupied", "reserved", "cleaning"]),
});

export type CreateTableDTO = z.infer<typeof createTableSchema>;
export type UpdateTableStatusDTO = z.infer<typeof updateTableStatusSchema>;
