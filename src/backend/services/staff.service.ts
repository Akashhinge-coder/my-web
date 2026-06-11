import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { StaffRepository } from "@/backend/repositories/staff.repository";
import { AuditService } from "@/backend/services/audit.service";
import type { CreateStaffDTO, UpdateStaffDTO } from "@/backend/validations/staff.schema";
import { OWNER_SAFE_ROLES } from "@/backend/validations/staff.schema";
import type { Staff } from "@/types/domain";


export class StaffService {
  static async listMembers(): Promise<Staff[]> {
    const { restaurantId } = await this.resolveOwnerAccess();
    return StaffRepository.listByRestaurant(restaurantId);
  }

  static async createMember(dto: CreateStaffDTO): Promise<Staff> {
    // SECURITY: Defence-in-depth — reject superadmin even if schema is bypassed.
    this.assertOwnerSafeRole(dto.role);
    const { restaurantId } = await this.resolveOwnerAccess();
    return StaffRepository.create(restaurantId, dto);
  }

  static async updateMember(staffId: string, dto: UpdateStaffDTO): Promise<Staff> {
    // SECURITY: Defence-in-depth — reject superadmin role assignment.
    if (dto.role !== undefined) this.assertOwnerSafeRole(dto.role);
    const { restaurantId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) {
      throw new NotFoundError("Staff member not found");
    }
    return StaffRepository.update(restaurantId, staffId, dto);
  }

  static async deleteMember(staffId: string): Promise<void> {
    const { restaurantId, ownerId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) {
      throw new NotFoundError("Staff member not found");
    }
    // Phase 8: soft-delete (set is_active = false) — preserves history and audit trail.
    await StaffRepository.deactivate(restaurantId, staffId);

    // Audit log for staff deactivation
    void AuditService.log({
      actorUserId: ownerId,
      action: "STAFF_DELETE",
      targetType: "staff",
      targetId: staffId,
      metadata: { staffName: existing.name, role: existing.role, restaurantId },
    });
  }

  /** Staff management is owner-only (matches legacy page tenant lookup). */
  private static async resolveOwnerAccess(): Promise<{ restaurantId: string; ownerId: string }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const ownedRestaurant = await BillingRepository.getOwnedRestaurantForUser(user.id);
    if (!ownedRestaurant) {
      throw new AuthError("Only restaurant owners can manage staff", 403, "FORBIDDEN");
    }

    return { restaurantId: ownedRestaurant.id, ownerId: user.id };
  }

  /**
   * SECURITY: Defence-in-depth role guard.
   * Rejects superadmin assignment even if schema-layer validation is bypassed.
   */
  private static assertOwnerSafeRole(role: string | undefined): void {
    if (!role) return;
    if (!(OWNER_SAFE_ROLES as readonly string[]).includes(role)) {
      throw new ValidationError(
        `Role '${role}' cannot be assigned by a restaurant owner`,
        { role: [`Invalid role: ${role}`] }
      );
    }
  }
}
