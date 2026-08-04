import { z } from "zod";

// Shared metadata schema
const metadataSchema = z.object({
  occasion: z.string().optional(),
  preferred_area: z.string().optional(),
  source: z.string().optional(),
  campaign: z.string().optional(),
  special_request: z.string().optional(),
  language: z.string().optional(),
  device: z.string().optional(),
}).catchall(z.any());

export const createReservationRequestSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  party_size: z.coerce.number().int().positive(),
  requested_time: z.string().min(1, "Requested time is required"),
  metadata: metadataSchema.optional().default({}),
});

export const updateReservationRequestStatusSchema = z.object({
  status: z.enum(["REQUESTED", "VERIFIED", "REJECTED", "EXPIRED"]),
});

export const updateReservationStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "SEATED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  version: z.number().int().positive().optional(), // For optimistic locking (optional for backwards compat if needed)
});

export const createWaitlistSchema = z.object({
  guest_name: z.string().trim().min(1, "Guest name is required"),
  guest_phone: z.string().min(1, "Phone is required"),
  party_size: z.coerce.number().int().positive(),
  quoted_wait_minutes: z.coerce.number().int().nonnegative().optional().nullable(),
});

export const updateWaitlistStatusSchema = z.object({
  status: z.enum(["waiting", "notified", "seated", "left"]),
});

export type CreateReservationRequestDTO = z.infer<typeof createReservationRequestSchema>;
export type UpdateReservationRequestStatusDTO = z.infer<typeof updateReservationRequestStatusSchema>;
export type UpdateReservationStatusDTO = z.infer<typeof updateReservationStatusSchema>;
export type CreateWaitlistDTO = z.infer<typeof createWaitlistSchema>;
export type UpdateWaitlistStatusDTO = z.infer<typeof updateWaitlistStatusSchema>;
