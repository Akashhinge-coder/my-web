import { apiFetch } from "@/frontend/api/http";
import type {
  AnalyticsCustomersReport,
  AnalyticsDashboard,
  AnalyticsOrdersReport,
  AnalyticsSalesReport,
} from "@/types/analytics";

export type AnalyticsRange = "7" | "30" | "90";

function withRange(range: AnalyticsRange, path: string): string {
  const q = new URLSearchParams({ range });
  return `${path}?${q}`;
}

export const analyticsApi = {
  getDashboard(range: AnalyticsRange): Promise<AnalyticsDashboard> {
    return apiFetch<AnalyticsDashboard>(withRange(range, "/api/v1/analytics"));
  },

  getSales(range: AnalyticsRange): Promise<AnalyticsSalesReport> {
    return apiFetch<AnalyticsSalesReport>(withRange(range, "/api/v1/analytics/sales"));
  },

  getOrders(range: AnalyticsRange): Promise<AnalyticsOrdersReport> {
    return apiFetch<AnalyticsOrdersReport>(withRange(range, "/api/v1/analytics/orders"));
  },

  getCustomers(range: AnalyticsRange): Promise<AnalyticsCustomersReport> {
    return apiFetch<AnalyticsCustomersReport>(withRange(range, "/api/v1/analytics/customers"));
  },
};
