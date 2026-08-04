import { z } from "zod";

/**
 * SECURITY: Owner-safe roles only. "superadmin" is intentionally excluded.
 * Restaurant owners MUST NOT be able to create or promote to superadmin.
 * Superadmin assignment is an infrastructure-only operation performed via
 * the Supabase admin dashboard or service-role API.
 */
export const ownerSafeRoleSchema = z.enum(["admin", "manager", "waiter", "kitchen"]);

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  role_id: ownerSafeRoleSchema,
  phone: z.string().optional().nullable(),
  shift_start: z.string().optional().nullable(),
  shift_end: z.string().optional().nullable(),
  permission_ids: z.array(z.string()).optional(),
});

export const updateStaffSchema = createStaffSchema.partial();

/**
 * SECURITY: staffInviteSchema intentionally uses ownerSafeRoleSchema.
 * "superadmin" has been removed — an owner cannot invite a superadmin.
 */
export const staffInviteSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().optional(),
  role_id: ownerSafeRoleSchema,
});

export type CreateStaffDTO = z.infer<typeof createStaffSchema>;
export type UpdateStaffDTO = z.infer<typeof updateStaffSchema>;
export type StaffInviteDTO = z.infer<typeof staffInviteSchema>;

/** Type-level constant to assert superadmin cannot be used in owner ops. */
export const OWNER_SAFE_ROLES = ["admin", "manager", "waiter", "kitchen"] as const;
export type OwnerSafeRole = typeof OWNER_SAFE_ROLES[number];
