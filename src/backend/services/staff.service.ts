import { createClient, createAdminClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { StaffRepository } from "@/backend/repositories/staff.repository";
import { AuditService } from "@/backend/services/audit.service";
import { ROLE_TEMPLATES } from "@/config/permissions";
import type { CreateStaffDTO, UpdateStaffDTO } from "@/backend/validations/staff.schema";
import { OWNER_SAFE_ROLES } from "@/backend/validations/staff.schema";
import type { Staff } from "@/types/domain";

export class StaffService {
  static async listMembers(): Promise<Staff[]> {
    const { restaurantId } = await this.resolveOwnerAccess();
    return StaffRepository.listByRestaurant(restaurantId);
  }

  static async createMember(dto: CreateStaffDTO): Promise<{ staff: Staff; credentials?: { username: string; password: string } }> {
    this.assertOwnerSafeRole(dto.role_id);
    const { restaurantId, ownerId } = await this.resolveOwnerAccess();
    
    // Generate deterministic username (e.g. rahul, rahul2)
    const baseUsername = dto.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername) throw new ValidationError("Invalid name for username generation");
    
    const supabase = createAdminClient();
    
    // Check existing usernames
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("username")
      .eq("restaurant_id", restaurantId)
      .ilike("username", `${baseUsername}%`);
      
    let username = baseUsername;
    if (existingStaff && existingStaff.length > 0) {
      const existingUsernames = new Set(existingStaff.map(s => s.username));
      let counter = 2;
      while (existingUsernames.has(`${baseUsername}${counter}`)) {
        counter++;
      }
      username = `${baseUsername}${counter}`;
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const email = `${username}_${restaurantId}@menuara.staff`;

    // Create Supabase User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create Staff Record
    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .insert({
        restaurant_id: restaurantId,
        user_id: authData.user.id,
        name: dto.name.trim(),
        role_id: dto.role_id,
        username: username,
        phone: dto.phone?.trim() || null,
        shift_start: dto.shift_start || null,
        shift_end: dto.shift_end || null,
        status: "ACTIVE",
        must_change_password: true,
        temporary_password_expires_at: expiresAt.toISOString(),
      })
      .select("*")
      .single();

    if (staffError || !staffData) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create staff record: ${staffError?.message}`);
    }

    // Handle Custom Permissions (Overrides)
    if (dto.permission_ids) {
      const defaultPermissions = new Set(ROLE_TEMPLATES[dto.role_id] || []);
      const selectedPermissions = new Set(dto.permission_ids);
      
      const overrides = [];
      // Granted overrides
      for (const p of selectedPermissions) {
        if (!defaultPermissions.has(p)) {
          overrides.push({ staff_id: staffData.id, permission_id: p, is_granted: true });
        }
      }
      // Revoked overrides
      for (const p of defaultPermissions) {
        if (!selectedPermissions.has(p)) {
          overrides.push({ staff_id: staffData.id, permission_id: p, is_granted: false });
        }
      }

      if (overrides.length > 0) {
        await supabase.from("staff_permission_overrides").insert(overrides);
      }
    }

    // Audit Event
    void AuditService.log({
      actorUserId: ownerId,
      action: "STAFF_CREATED",
      targetType: "staff",
      targetId: staffData.id,
      metadata: { username, role: dto.role_id, restaurantId },
    });

    return { 
      staff: staffData as any, // Mapper handled externally or in API route
      credentials: { username, password: temporaryPassword } 
    };
  }

  static async updateMember(staffId: string, dto: UpdateStaffDTO): Promise<Staff> {
    if (dto.role_id !== undefined) this.assertOwnerSafeRole(dto.role_id);
    const { restaurantId, ownerId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) {
      throw new NotFoundError("Staff member not found");
    }
    
    // Basic update for now, ideally also update overrides
    const updated = await StaffRepository.update(restaurantId, staffId, dto);
    
    // Audit log if role changed
    if (dto.role_id && dto.role_id !== existing.role_id) {
      void AuditService.log({
        actorUserId: ownerId,
        action: "ROLE_CHANGED",
        targetType: "staff",
        targetId: staffId,
        metadata: { oldRole: existing.role_id, newRole: dto.role_id, restaurantId },
      });
    }

    return updated;
  }

  static async deleteMember(staffId: string): Promise<void> {
    const { restaurantId, ownerId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) throw new NotFoundError("Staff member not found");
    
    await StaffRepository.deactivate(restaurantId, staffId);

    void AuditService.log({
      actorUserId: ownerId,
      action: "ACCOUNT_SUSPENDED",
      targetType: "staff",
      targetId: staffId,
      metadata: { staffName: existing.name, role: existing.role_id, restaurantId },
    });
  }

  static async resetPassword(staffId: string): Promise<{ password: string }> {
    const { restaurantId, ownerId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) throw new NotFoundError("Staff member not found");
    if (!existing.user_id) throw new ValidationError("Staff member has no associated login account");

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const supabase = createAdminClient();
    
    // Update Auth User Password
    const { error: authError } = await supabase.auth.admin.updateUserById(existing.user_id, {
      password: temporaryPassword,
    });

    if (authError) {
      throw new Error(`Failed to reset password: ${authError.message}`);
    }

    // Force password change on next login
    const { error: updateError } = await supabase
      .from("staff")
      .update({
        must_change_password: true,
        temporary_password_expires_at: expiresAt.toISOString(),
        failed_login_attempts: 0,
        status: "ACTIVE",
        locked_until: null,
      })
      .eq("restaurant_id", restaurantId)
      .eq("id", staffId);

    if (updateError) {
      throw new Error(`Failed to update staff record after password reset: ${updateError.message}`);
    }

    void AuditService.log({
      actorUserId: ownerId,
      action: "PASSWORD_RESET",
      targetType: "staff",
      targetId: staffId,
      metadata: { staffName: existing.name, role: existing.role_id, restaurantId },
    });

    return { password: temporaryPassword };
  }

  private static async resolveOwnerAccess(): Promise<{ restaurantId: string; ownerId: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const ownedRestaurant = await BillingRepository.getOwnedRestaurantForUser(user.id);
    if (!ownedRestaurant) throw new AuthError("Only restaurant owners can manage staff", 403, "FORBIDDEN");

    return { restaurantId: ownedRestaurant.id, ownerId: user.id };
  }

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
