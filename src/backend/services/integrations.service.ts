import {
  buildIntegrationsStats,
  type IntegrationsDashboardDTO,
  type IntegrationsStatsDTO,
} from "@/backend/mappers/integrations.mapper";
import { IntegrationsRepository } from "@/backend/repositories/integrations.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { IntegrationsStatsQueryDTO } from "@/backend/validations/integrations.validation";

function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

export class IntegrationsService {
  static async getDashboard(dto: IntegrationsStatsQueryDTO): Promise<IntegrationsDashboardDTO> {
    const access = await resolveRestaurantAccess();
    return {
      restaurant: {
        id: access.restaurantId,
        name: access.restaurantName,
        phone: access.restaurantPhone ?? "",
      },
      stats: await this.getStatsForRestaurant(access.restaurantId, dto),
    };
  }

  static async getStats(dto: IntegrationsStatsQueryDTO): Promise<IntegrationsStatsDTO> {
    const access = await resolveRestaurantAccess();
    return this.getStatsForRestaurant(access.restaurantId, dto);
  }

  private static async getStatsForRestaurant(
    restaurantId: string,
    dto: IntegrationsStatsQueryDTO
  ): Promise<IntegrationsStatsDTO> {
    const fromISO = dto.date ?? todayISODate();
    const [orders, payments, sessions] = await Promise.all([
      IntegrationsRepository.listOrdersSince(restaurantId, fromISO),
      IntegrationsRepository.listPaymentsSince(restaurantId, fromISO),
      IntegrationsRepository.listSessionsSince(restaurantId, fromISO),
    ]);
    const items = await IntegrationsRepository.listOrderItems(orders.map((order) => order.id));

    return buildIntegrationsStats({ orders, payments, sessions, items });
  }
}
