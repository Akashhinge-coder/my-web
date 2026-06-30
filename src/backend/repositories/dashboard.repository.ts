import { createClient } from "@/config/supabase/server";
import type {
  DashboardOrderRow,
  DashboardPaymentRow,
  DashboardRecentOrderRow,
  DashboardSessionRow,
  DashboardTableRow,
} from "@/backend/mappers/dashboard.mapper";

export class DashboardRepository {
  static async getDashboardRows(restaurantId: string, fromISO: string) {
    const supabase = await createClient();
    const [
      { data: todayOrders, error: todayOrdersError },
      { data: activeSessions, error: activeSessionsError },
      { data: tables, error: tablesError },
      { data: recentOrders, error: recentOrdersError },
      { data: payments, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id, grand_total:total, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", fromISO)
        .neq("status", "cancelled"),
      supabase
        .from("sessions")
        .select("id, table_id, guest_count, started_at, total_amount")
        .eq("restaurant_id", restaurantId)
        .eq("status", "active"),
      supabase
        .from("restaurant_tables")
        .select("id, table_number, status, seating_capacity")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("orders")
        .select(`
          id, order_number, status, grand_total:total, created_at, source,
          order_items(quantity, dishes(name))
        `)
        .eq("restaurant_id", restaurantId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("payments")
        .select("amount, payment_method, paid_at")
        .eq("restaurant_id", restaurantId)
        .eq("payment_status", "paid")
        .gte("paid_at", fromISO),
    ]);

    if (todayOrdersError) throw todayOrdersError;
    if (activeSessionsError) throw activeSessionsError;
    if (tablesError) throw tablesError;
    if (recentOrdersError) throw recentOrdersError;
    if (paymentsError) throw paymentsError;

    return {
      todayOrders: (todayOrders ?? []) as DashboardOrderRow[],
      activeSessions: (activeSessions ?? []) as DashboardSessionRow[],
      tables: (tables ?? []) as DashboardTableRow[],
      recentOrders: (recentOrders ?? []) as unknown as DashboardRecentOrderRow[],
      payments: (payments ?? []) as DashboardPaymentRow[],
    };
  }
}
