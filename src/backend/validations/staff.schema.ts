import { z } from "zod";

export const staffRoleSchema = z.enum(["admin", "manager", "waiter", "kitchen"]);

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  role: staffRoleSchema,
  phone: z.string().optional().nullable(),
  shift_start: z.string().optional().nullable(),
  shift_end: z.string().optional().nullable(),
});

export const updateStaffSchema = createStaffSchema.partial();

export const staffInviteSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().optional(),
  role: z.enum(["admin", "manager", "waiter", "kitchen", "superadmin"]),
});

export type CreateStaffDTO = z.infer<typeof createStaffSchema>;
export type UpdateStaffDTO = z.infer<typeof updateStaffSchema>;
export type StaffInviteDTO = z.infer<typeof staffInviteSchema>;
