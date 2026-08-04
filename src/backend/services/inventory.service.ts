import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { requireRole } from "@/backend/middleware/rbac.middleware";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { InventoryRepository } from "@/backend/repositories/inventory.repository";
import type {
  CreateInventoryDTO,
  UpdateInventoryDTO,
} from "@/backend/validations/inventory.validation";
import type { InventoryItem, UserRole } from "@/types/domain";

const INVENTORY_ROLES: UserRole[] = ["admin", "manager"];

export class InventoryService {
  static isLowStock(currentQty: number, lowStockAlert: number) {
    return currentQty <= lowStockAlert;
  }

  static async listItems(): Promise<InventoryItem[]> {
    const access = await this.resolveInventoryAccess();
    return InventoryRepository.listByRestaurant(access.restaurantId);
  }

  static async createItem(dto: CreateInventoryDTO): Promise<InventoryItem> {
    const access = await this.resolveInventoryAccess();
    return InventoryRepository.create(access.restaurantId, dto);
  }

  static async updateItem(itemId: string, dto: UpdateInventoryDTO): Promise<InventoryItem> {
    const access = await this.resolveInventoryAccess();
    const existing = await InventoryRepository.findById(access.restaurantId, itemId);
    if (!existing) {
      throw new NotFoundError("Inventory item not found");
    }
    return InventoryRepository.update(access.restaurantId, itemId, dto, existing);
  }

  static async deleteItem(itemId: string): Promise<void> {
    const access = await this.resolveInventoryAccess();
    const existing = await InventoryRepository.findById(access.restaurantId, itemId);
    if (!existing) {
      throw new NotFoundError("Inventory item not found");
    }
    await InventoryRepository.delete(access.restaurantId, itemId);
  }

  private static async resolveInventoryAccess(): Promise<{ restaurantId: string; role: UserRole }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const ownedRestaurant = await BillingRepository.getOwnedRestaurantForUser(user.id);
    if (ownedRestaurant) {
      return { restaurantId: ownedRestaurant.id, role: "admin" };
    }

    const staffAccess = await BillingRepository.getStaffAccessForUser(user.id);
    if (!staffAccess) {
      throw new AuthError("Inventory access required", 403, "FORBIDDEN");
    }

    requireRole(staffAccess.role_id, INVENTORY_ROLES);
    return { restaurantId: staffAccess.restaurant.id, role: staffAccess.role_id };
  }
}
