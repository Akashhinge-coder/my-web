import { z } from "zod";

export const createWaitlistSchema = z.object({
  guest_name: z.string().trim().min(1, "Guest name is required"),
  guest_phone: z.string().min(1, "Phone is required"),
  party_size: z.coerce.number().int().positive(),
});

export const updateWaitlistStatusSchema = z.object({
  status: z.enum(["waiting", "notified", "seated", "left"]),
});

export type CreateWaitlistDTO = z.infer<typeof createWaitlistSchema>;
export type UpdateWaitlistStatusDTO = z.infer<typeof updateWaitlistStatusSchema>;
