import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { PlatformRepository } from "@/backend/repositories/platform.repository";
import type { UpdateRestaurantActivationDTO } from "@/backend/validations/platform.schema";
import type { PlatformDashboard, PlatformStats } from "@/types/platform";

export class PlatformService {
  static async assertSuperadminAccess(): Promise<void> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    const metadataRole = user.app_metadata?.role ?? user.user_metadata?.role;
    if (metadataRole === "superadmin") return;

    const hasStaffRole = await PlatformRepository.userHasSuperadminAccess(user.id);
    if (!hasStaffRole) {
      throw new AuthError("Superadmin access required", 403, "FORBIDDEN");
    }
  }

  static async getDashboard(): Promise<PlatformDashboard> {
    await this.assertSuperadminAccess();

    const [restaurants, payments, orders] = await Promise.all([
      PlatformRepository.listRestaurants(),
      PlatformRepository.listPaymentMetrics(),
      PlatformRepository.listOrderMetrics(),
    ]);

    const stats: PlatformStats = {
      total: restaurants.length,
      active: restaurants.filter((restaurant) => restaurant.is_active).length,
      orders: orders.length,
      revenue: payments.reduce(
        (sum, payment) => sum + Number(payment.amount_paid ?? 0),
        0
      ),
    };

    return { restaurants, stats };
  }

  static async updateRestaurantActivation(
    dto: UpdateRestaurantActivationDTO
  ) {
    await this.assertSuperadminAccess();
    return PlatformRepository.setRestaurantActive(dto.restaurantId, dto.isActive);
  }
}

