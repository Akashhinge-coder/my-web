import { createClient } from "@/config/supabase/server";

export interface AnalyticsOrderRow {
  id: string;
  subtotal: number | string;
  coupon_discount: number | string;
  loyalty_discount: number | string;
  happy_hour_discount: number | string;
  taxable_amount: number | string;
  cgst: number | string;
  sgst: number | string;
  gst: number | string;
  total_discount: number | string;
  grand_total: number | string;
  created_at: string;
  status: string;
}

export interface AnalyticsPaymentRow {
  amount_paid: number | string;
  method: string;
  confirmed_at: string | null;
}

export interface AnalyticsOrderItemRow {
  quantity: number | string;
  total_price: number | string;
  dishes: unknown;
}

export interface AnalyticsSessionRow {
  id: string;
  guest_count: number | string;
}

export interface AnalyticsRatingRow {
  overall_score: number | string;
}

export interface AnalyticsRawData {
  orders: AnalyticsOrderRow[];
  payments: AnalyticsPaymentRow[];
  orderItems: AnalyticsOrderItemRow[];
  sessions: AnalyticsSessionRow[];
  ratings: AnalyticsRatingRow[];
}

export class AnalyticsRepository {
  static async fetchRangeData(
    restaurantId: string,
    fromISO: string
  ): Promise<AnalyticsRawData> {
    const supabase = await createClient();

    const [
      { data: orders, error: ordersError },
      { data: payments, error: paymentsError },
      { data: sessions, error: sessionsError },
      { data: ratings, error: ratingsError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(`
          id, subtotal, coupon_discount, loyalty_discount,
          happy_hour_discount, taxable_amount, cgst, sgst,
          gst, total_discount, grand_total, created_at, status
        `)
        .eq("restaurant_id", restaurantId)
        .gte("created_at", fromISO)
        .eq("status", "served"),
      supabase
        .from("payments")
        .select("amount_paid, method, confirmed_at")
        .eq("restaurant_id", restaurantId)
        .gte("confirmed_at", fromISO),
      supabase
        .from("sessions")
        .select("id, guest_count")
        .eq("restaurant_id", restaurantId)
        .gte("started_at", fromISO),
      supabase
        .from("ratings")
        .select("overall_score")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", fromISO),
    ]);

    if (ordersError) throw ordersError;
    if (paymentsError) throw paymentsError;
    if (sessionsError) throw sessionsError;
    if (ratingsError) throw ratingsError;

    const orderRows = (orders ?? []) as AnalyticsOrderRow[];
    const orderIds = orderRows.map((o) => o.id);

    let orderItems: AnalyticsOrderItemRow[] = [];
    if (orderIds.length > 0) {
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, total_price, dishes(name)")
        .in("order_id", orderIds);

      if (error) throw error;
      orderItems = (data ?? []) as AnalyticsOrderItemRow[];
    }

    return {
      orders: orderRows,
      payments: (payments ?? []) as AnalyticsPaymentRow[],
      orderItems,
      sessions: (sessions ?? []) as AnalyticsSessionRow[],
      ratings: (ratings ?? []) as AnalyticsRatingRow[],
    };
  }
}
