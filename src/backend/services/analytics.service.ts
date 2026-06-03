import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { requireRole } from "@/backend/middleware/rbac.middleware";
import {
  buildAnalyticsDashboard,
  buildCustomersReport,
  buildOrdersReport,
  buildSalesReport,
} from "@/backend/mappers/analytics.mapper";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { AnalyticsRepository } from "@/backend/repositories/analytics.repository";
import type { AnalyticsRangeDTO } from "@/backend/validations/analytics.validation";
import type {
  AnalyticsCustomersReport,
  AnalyticsDashboard,
  AnalyticsOrdersReport,
  AnalyticsSalesReport,
} from "@/types/analytics";
import type { UserRole } from "@/types/domain";

const ANALYTICS_ROLES: UserRole[] = ["admin", "manager"];

export class AnalyticsService {
  static async getDashboard(dto: AnalyticsRangeDTO): Promise<AnalyticsDashboard> {
    const { raw, days } = await this.loadRangeData(dto);
    return buildAnalyticsDashboard(raw, days);
  }

  static async getSales(dto: AnalyticsRangeDTO): Promise<AnalyticsSalesReport> {
    const { raw, days } = await this.loadRangeData(dto);
    return buildSalesReport(raw, days);
  }

  static async getOrders(dto: AnalyticsRangeDTO): Promise<AnalyticsOrdersReport> {
    const { raw, days } = await this.loadRangeData(dto);
    return buildOrdersReport(raw, days);
  }

  static async getCustomers(dto: AnalyticsRangeDTO): Promise<AnalyticsCustomersReport> {
    const { raw } = await this.loadRangeData(dto);
    return buildCustomersReport(raw);
  }

  /** @deprecated Use getDashboard or repository-backed methods */
  static async revenue(restaurantId: string) {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const raw = await AnalyticsRepository.fetchRangeData(restaurantId, from.toISOString());
    return raw.orders.reduce((sum, order) => sum + Number(order.grand_total ?? 0), 0);
  }

  private static async loadRangeData(dto: AnalyticsRangeDTO) {
    const access = await this.resolveAnalyticsAccess();
    const days = parseInt(dto.range, 10);
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromISO = from.toISOString();
    const raw = await AnalyticsRepository.fetchRangeData(access.restaurantId, fromISO);
    return { raw, days };
  }

  private static async resolveAnalyticsAccess(): Promise<{ restaurantId: string; role: UserRole }> {
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
      throw new AuthError("Analytics access required", 403, "FORBIDDEN");
    }

    requireRole(staffAccess.role, ANALYTICS_ROLES);
    return { restaurantId: staffAccess.restaurant.id, role: staffAccess.role };
  }
}
