import { apiFetch } from "@/frontend/api/http";
import type { Order } from "@/types/domain";
import type { OrderPricingDto } from "@/types/pricing";

export type OrderListScope = "today" | "kitchen" | "session" | "all";

export interface PlaceOrderPayload {
  tableId: string;
  sessionId?: string;
  items: Array<{ dishId: string; quantity: number; notes?: string }>;
  notes?: string;
}

export interface OrderPricingPayload {
  items: Array<{ dishId: string; quantity: number; notes?: string }>;
  couponCode?: string;
  loyaltyPhone?: string;
  loyaltyPointsToRedeem?: number;
  timestamp?: string;
}

export interface PlaceOrderResult {
  order: Order;
  sessionId: string;
}

export interface SessionBill {
  restaurant: {
    name: string;
    gst_number: string | null;
    phone: string;
    cgst_rate: number;
    sgst_rate: number;
  };
  table: { table_number: string };
  orders: Array<{
    order_number: string;
    total: number;
    grand_total?: number;
    items: Array<{
      quantity: number;
      unit_price: number;
      dish: { name: string } | null;
    }>;
  }>;
  pricing: OrderPricingDto;
  sessionId?: string;
}

export const sessionsApi = {
  getActive(tableId: string) {
    return apiFetch<{ id: string } | null>(`/api/v1/sessions/active?tableId=${tableId}`);
  },
};

export const ordersApi = {
  list(params: { restaurantId: string; scope?: OrderListScope; sessionId?: string }) {
    const search = new URLSearchParams({ restaurantId: params.restaurantId });
    if (params.scope) search.set("scope", params.scope);
    if (params.sessionId) search.set("sessionId", params.sessionId);
    return apiFetch<unknown[]>(`/api/v1/orders?${search}`);
  },

  listBySession(sessionId: string) {
    return apiFetch<unknown[]>(`/api/v1/orders/session?sessionId=${sessionId}`);
  },

  place(restaurantId: string, payload: PlaceOrderPayload) {
    return apiFetch<PlaceOrderResult>(
      `/api/v1/orders?restaurantId=${restaurantId}&mode=place`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  quotePricing(restaurantId: string, payload: OrderPricingPayload) {
    return apiFetch<OrderPricingDto>(
      `/api/v1/orders?restaurantId=${restaurantId}&mode=pricing`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  updateStatus(restaurantId: string, orderId: string, status: string) {
    return apiFetch<unknown>(`/api/v1/orders/${orderId}?restaurantId=${restaurantId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  getBill(slug: string, tableId: string) {
    const search = new URLSearchParams({ slug, tableId });
    return apiFetch<SessionBill>(`/api/v1/orders/bill?${search}`);
  },
};
