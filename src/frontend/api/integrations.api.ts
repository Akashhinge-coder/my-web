import { apiFetch } from "@/frontend/api/http";

export interface IntegrationsRestaurant {
  id: string;
  name: string;
  phone: string;
}

export interface IntegrationsStats {
  revenue: number;
  orders: number;
  covers: number;
  topDish: string;
  upi: number;
  cash: number;
  card: number;
}

export interface IntegrationsDashboard {
  restaurant: IntegrationsRestaurant;
  stats: IntegrationsStats;
}

function withDate(path: string, date?: string): string {
  if (!date) return path;
  const search = new URLSearchParams({ date });
  return `${path}?${search}`;
}

export const integrationsApi = {
  getDashboard(date?: string) {
    return apiFetch<IntegrationsDashboard>(withDate("/api/v1/integrations", date));
  },

  getStats(date?: string) {
    return apiFetch<IntegrationsStats>(withDate("/api/v1/integrations/stats", date));
  },
};
