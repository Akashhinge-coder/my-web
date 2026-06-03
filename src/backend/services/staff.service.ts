import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { StaffRepository } from "@/backend/repositories/staff.repository";
import type { CreateStaffDTO, UpdateStaffDTO } from "@/backend/validations/staff.schema";
import type { Staff } from "@/types/domain";

export class StaffService {
  static async listMembers(): Promise<Staff[]> {
    const { restaurantId } = await this.resolveOwnerAccess();
    return StaffRepository.listByRestaurant(restaurantId);
  }

  static async createMember(dto: CreateStaffDTO): Promise<Staff> {
    const { restaurantId } = await this.resolveOwnerAccess();
    return StaffRepository.create(restaurantId, dto);
  }

  static async updateMember(staffId: string, dto: UpdateStaffDTO): Promise<Staff> {
    const { restaurantId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) {
      throw new NotFoundError("Staff member not found");
    }
    return StaffRepository.update(restaurantId, staffId, dto);
  }

  static async deleteMember(staffId: string): Promise<void> {
    const { restaurantId } = await this.resolveOwnerAccess();
    const existing = await StaffRepository.findById(restaurantId, staffId);
    if (!existing) {
      throw new NotFoundError("Staff member not found");
    }
    await StaffRepository.delete(restaurantId, staffId);
  }

  /** Staff management is owner-only (matches legacy page tenant lookup). */
  private static async resolveOwnerAccess(): Promise<{ restaurantId: string }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const ownedRestaurant = await BillingRepository.getOwnedRestaurantForUser(user.id);
    if (!ownedRestaurant) {
      throw new AuthError("Only restaurant owners can manage staff", 403, "FORBIDDEN");
    }

    return { restaurantId: ownedRestaurant.id };
  }
}
