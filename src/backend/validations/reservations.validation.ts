import { z } from "zod";

export const createReservationSchema = z.object({
  guest_name: z.string().trim().min(1, "Guest name is required"),
  guest_phone: z.string().min(1, "Phone is required"),
  party_size: z.coerce.number().int().positive(),
  reserved_at: z.string().min(1, "Date and time are required"),
  notes: z.string().optional().nullable(),
  table_id: z.string().optional().nullable(),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(["confirmed", "seated", "cancelled", "no_show"]),
});

export type CreateReservationDTO = z.infer<typeof createReservationSchema>;
export type UpdateReservationStatusDTO = z.infer<typeof updateReservationStatusSchema>;
