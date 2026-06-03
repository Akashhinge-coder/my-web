import { apiFetch } from "@/frontend/api/http";

export interface DashboardStats {
  todayRevenue: number;
  totalOrders: number;
  pendingCount: number;
  cookingCount: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  cleaningTables: number;
  totalTables: number;
  totalCovers: number;
  activeSessionCount: number;
}

export interface DashboardRecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  source: string;
  summary: string;
  extra: string;
}

export interface DashboardTable {
  id: string;
  tableNumber: string;
  status: string;
  seatingCapacity: number;
}

export interface DashboardPayment {
  amountPaid: number;
  method: string;
  confirmedAt: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  recentOrders: DashboardRecentOrder[];
  tables: DashboardTable[];
  payments: DashboardPayment[];
}

export const dashboardApi = {
  getDashboard() {
    return apiFetch<DashboardData>("/api/v1/dashboard");
  },
};
