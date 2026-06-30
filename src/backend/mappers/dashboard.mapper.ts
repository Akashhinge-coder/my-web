import { dishNameFromJoin } from "@/lib/utils";

export interface DashboardOrderRow {
  id: string;
  grand_total: number | string;
  status: string;
  created_at: string;
}

export interface DashboardSessionRow {
  id: string;
  table_id: string;
  guest_count: number | string;
  started_at: string;
  total_amount: number | string;
}

export interface DashboardTableRow {
  id: string;
  table_number: string;
  status: string;
  seating_capacity: number;
}

export interface DashboardRecentOrderRow {
  id: string;
  order_number: string;
  status: string;
  grand_total: number | string;
  created_at: string;
  source: string;
  order_items: Array<{ quantity: number; dishes: unknown }> | null;
}

export interface DashboardPaymentRow {
  amount: number | string;
  payment_method: string;
  paid_at: string | null;
}

export interface DashboardStatsDTO {
  todayRevenue: number;
  totalOrders: number;
  pendingCount: number;
  cookingCount: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  cleaningTables: number;
  awaitingPaymentTables: number;
  totalTables: number;
  totalCovers: number;
  activeSessionCount: number;
}

export interface DashboardRecentOrderDTO {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  source: string;
  summary: string;
  extra: string;
}

export interface DashboardTableDTO {
  id: string;
  tableNumber: string;
  status: string;
  seatingCapacity: number;
}

export interface DashboardPaymentDTO {
  amountPaid: number;
  method: string;
  confirmedAt: string | null;
}

export interface DashboardDTO {
  stats: DashboardStatsDTO;
  recentOrders: DashboardRecentOrderDTO[];
  tables: DashboardTableDTO[];
  payments: DashboardPaymentDTO[];
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function buildDashboardDTO(params: {
  todayOrders: DashboardOrderRow[];
  activeSessions: DashboardSessionRow[];
  tables: DashboardTableRow[];
  recentOrders: DashboardRecentOrderRow[];
  payments: DashboardPaymentRow[];
}): DashboardDTO {
  return {
    stats: {
      todayRevenue: params.todayOrders.reduce((sum, order) => sum + toNumber(order.grand_total), 0),
      totalOrders: params.todayOrders.length,
      pendingCount: params.todayOrders.filter((order) => order.status === "pending").length,
      cookingCount: params.todayOrders.filter((order) => order.status === "cooking").length,
      availableTables: params.tables.filter((table) => table.status === "available").length,
      occupiedTables: params.tables.filter((table) => table.status === "occupied").length,
      reservedTables: params.tables.filter((table) => table.status === "reserved").length,
      cleaningTables: params.tables.filter((table) => table.status === "cleaning").length,
      awaitingPaymentTables: params.tables.filter((table) => table.status === "awaiting_payment").length,
      totalTables: params.tables.length,
      totalCovers: params.activeSessions.reduce((sum, session) => sum + toNumber(session.guest_count), 0),
      activeSessionCount: params.activeSessions.length,
    },
    recentOrders: params.recentOrders.map((order) => {
      const items = order.order_items ?? [];
      const summary = items
        .slice(0, 2)
        .map((item) => `${item.quantity}× ${dishNameFromJoin(item.dishes, "Item")}`)
        .join(", ");
      const extra = items.length > 2 ? ` +${items.length - 2} more` : "";

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        total: toNumber(order.grand_total),
        createdAt: order.created_at,
        source: order.source,
        summary,
        extra,
      };
    }),
    tables: params.tables.map((table) => ({
      id: table.id,
      tableNumber: table.table_number,
      status: table.status,
      seatingCapacity: table.seating_capacity,
    })),
    payments: params.payments.map((payment) => ({
      amountPaid: toNumber(payment.amount),
      method: payment.payment_method,
      confirmedAt: payment.paid_at,
    })),
  };
}
