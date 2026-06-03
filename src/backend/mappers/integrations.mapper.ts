import { dishNameFromJoin } from "@/lib/utils";

export interface IntegrationsRestaurantDTO {
  id: string;
  name: string;
  phone: string;
}

export interface IntegrationsStatsDTO {
  revenue: number;
  orders: number;
  covers: number;
  topDish: string;
  upi: number;
  cash: number;
  card: number;
}

export interface IntegrationsDashboardDTO {
  restaurant: IntegrationsRestaurantDTO;
  stats: IntegrationsStatsDTO;
}

export interface IntegrationsOrderRow {
  id: string;
  grand_total: number | string;
}

export interface IntegrationsPaymentRow {
  amount_paid: number | string;
  method: string;
}

export interface IntegrationsSessionRow {
  guest_count: number | string;
}

export interface IntegrationsOrderItemRow {
  quantity: number | string;
  dishes: unknown;
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function buildIntegrationsStats(params: {
  orders: IntegrationsOrderRow[];
  payments: IntegrationsPaymentRow[];
  sessions: IntegrationsSessionRow[];
  items: IntegrationsOrderItemRow[];
}): IntegrationsStatsDTO {
  const dishCount: Record<string, number> = {};
  params.items.forEach((item) => {
    const name = dishNameFromJoin(item.dishes, "");
    if (!name) return;
    dishCount[name] = (dishCount[name] || 0) + toNumber(item.quantity);
  });

  return {
    revenue: params.orders.reduce((sum, order) => sum + toNumber(order.grand_total), 0),
    orders: params.orders.length,
    covers: params.sessions.reduce((sum, session) => sum + toNumber(session.guest_count), 0),
    topDish: Object.entries(dishCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    upi: params.payments
      .filter((payment) => ["upi", "gpay", "phonepe", "paytm"].includes(payment.method))
      .reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0),
    cash: params.payments
      .filter((payment) => payment.method === "cash")
      .reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0),
    card: params.payments
      .filter((payment) => payment.method === "card")
      .reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0),
  };
}
