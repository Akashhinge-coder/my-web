import { apiFetch } from "@/frontend/api/http";
import type { Order } from "@/types/domain";
import type { OrderPricingDto } from "@/types/pricing";

export type OrderListScope = "today" | "kitchen" | "session" | "all";

export interface PlaceOrderPayload {
  tableId: string;
  sessionId?: string;
  items: Array<{
    dishId?: string;
    comboId?: string;
    itemType?: "dish" | "combo";
    quantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface OrderPricingPayload {
  items: Array<{
    dishId?: string;
    comboId?: string;
    itemType?: "dish" | "combo";
    quantity: number;
    notes?: string;
  }>;
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
      item_name: string;
      item_type?: "dish" | "combo";
      combo_id?: string | null;
    }>;
  }>;
  pricing: OrderPricingDto;
  sessionId?: string;
}

export const sessionsApi = {
  bootstrap(tableId: string, qrToken?: string | null) {
    return apiFetch<{ sessionId: string; sessionToken: string; status: string }>(
      "/api/v1/sessions/bootstrap",
      {
        method: "POST",
        body: JSON.stringify({ tableId, qrToken }),
      }
    );
  },
};

export const ordersApi = {
  /**
   * Admin list — restaurantId is intentionally NOT sent.
   * The server derives it from the session cookie.
   */
  list(params: { scope?: OrderListScope; sessionId?: string } = {}) {
    const search = new URLSearchParams();
    if (params.scope) search.set("scope", params.scope);
    if (params.sessionId) search.set("sessionId", params.sessionId);
    search.set("t", Date.now().toString());
    return apiFetch<unknown[]>(`/api/v1/orders?${search}`);
  },

  listBySession(sessionId: string) {
    return apiFetch<unknown[]>(`/api/v1/orders/session?sessionId=${sessionId}&t=${Date.now()}`);
  },

  /** Customer QR ordering — restaurantId from QR URL is intentional */
  place(restaurantId: string, payload: PlaceOrderPayload) {
    return apiFetch<PlaceOrderResult>(
      `/api/v1/orders?restaurantId=${restaurantId}&mode=place`,
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  /** Customer QR pricing — restaurantId from QR URL is intentional */
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
