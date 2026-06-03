import { buildDashboardDTO, type DashboardDTO } from "@/backend/mappers/dashboard.mapper";
import { DashboardRepository } from "@/backend/repositories/dashboard.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";

function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

export class DashboardService {
  static async getDashboard(): Promise<DashboardDTO> {
    const access = await resolveRestaurantAccess();
    const rows = await DashboardRepository.getDashboardRows(access.restaurantId, todayISODate());
    return buildDashboardDTO(rows);
  }
}
