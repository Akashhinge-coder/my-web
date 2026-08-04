import { createAdminClient } from "@/config/supabase/server";
import { AuditService } from "./audit.service";
import type { Staff, Permission } from "@/types/domain";

// Simple in-memory cache for Effective Permissions
// Format: { [staff_id]: { permissions: Set<string>, expires: number } }
const PERMISSION_CACHE = new Map<string, { permissions: Set<string>; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class IAMService {
  /**
   * Resolves the effective permissions for a staff member.
   * Effective Permissions = Role Permissions + Overrides
   */
  static async getEffectivePermissions(staffId: string, restaurantId: string): Promise<Set<string>> {
    const now = Date.now();
    const cached = PERMISSION_CACHE.get(staffId);
    
    // Return cached permissions if valid
    if (cached && cached.expires > now) {
      return cached.permissions;
    }

    const supabase = createAdminClient();

    // 1. Fetch Staff Role and Role Permissions
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select(`
        role_id,
        roles (
          role_permissions ( permission_id )
        ),
        staff_permission_overrides ( permission_id, is_granted )
      `)
      .eq("id", staffId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (staffError || !staffData) {
      return new Set();
    }

    const effective = new Set<string>();

    // 2. Add Role Permissions
    const rolePermissions = (staffData.roles as any)?.role_permissions || [];
    for (const rp of rolePermissions) {
      effective.add(rp.permission_id);
    }

    // 3. Apply Overrides
    const overrides = staffData.staff_permission_overrides || [];
    for (const ov of overrides) {
      if (ov.is_granted) {
        effective.add(ov.permission_id);
      } else {
        effective.delete(ov.permission_id);
      }
    }

    // Cache the result
    PERMISSION_CACHE.set(staffId, {
      permissions: effective,
      expires: now + CACHE_TTL_MS,
    });

    return effective;
  }

  /**
   * Invalidate the permission cache for a staff member.
   */
  static invalidateCache(staffId: string) {
    PERMISSION_CACHE.delete(staffId);
  }

  /**
   * Helper function to check if a staff member has a specific permission.
   * This implements the formal authorization pipeline invariant.
   */
  static async can(
    staff: Pick<Staff, "id" | "restaurant_id" | "status" | "locked_until" | "temporary_password_expires_at">, 
    permissionId: string
  ): Promise<boolean> {
    if (!staff) return false;

    // 1. Check Status
    if (staff.status !== "ACTIVE") return false;

    // 2. Check Lockout
    if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
      return false; // Still locked
    }

    // 3. Resolve Effective Permissions
    const effective = await this.getEffectivePermissions(staff.id, staff.restaurant_id);

    return effective.has(permissionId);
  }

  /**
   * Regenerates a temporary password for a staff member.
   * Emits PASSWORD_RESET audit event.
   */
  static async resetStaffPassword(adminUserId: string, targetStaffId: string, restaurantId: string): Promise<string> {
    const supabase = createAdminClient();

    // Verify target exists
    const { data: targetStaff } = await supabase
      .from("staff")
      .select("id, username, user_id")
      .eq("id", targetStaffId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (!targetStaff) throw new Error("Staff member not found");

    // Generate new temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8);

    // Update Supabase Auth if user_id exists
    if (targetStaff.user_id) {
      await supabase.auth.admin.updateUserById(targetStaff.user_id, {
        password: temporaryPassword
      });
    }

    // Update Staff Record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase
      .from("staff")
      .update({
        must_change_password: true,
        temporary_password_expires_at: expiresAt.toISOString(),
      })
      .eq("id", targetStaffId);

    // Invalidate Cache and revoke sessions
    this.invalidateCache(targetStaffId);
    await supabase.from("staff_sessions").update({ revoked_at: new Date().toISOString() }).eq("staff_id", targetStaffId).is("revoked_at", null);

    // Audit Log
    void AuditService.log({
      actorUserId: adminUserId,
      action: "PASSWORD_RESET",
      targetType: "staff",
      targetId: targetStaffId,
      metadata: { reason: "Admin initiated reset", restaurantId },
    });

    return temporaryPassword;
  }
}
