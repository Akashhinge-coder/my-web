import { createAdminClient } from "@/config/supabase/server";
import type { PlatformRestaurant } from "@/types/platform";

interface PaymentMetricRow {
  amount_paid: number | string | null;
}

interface OrderMetricRow {
  id: string;
}

export class PlatformRepository {
  static async userHasSuperadminAccess(userId: string): Promise<boolean> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .limit(1);

    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  static async listRestaurants(): Promise<PlatformRestaurant[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, phone, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as PlatformRestaurant[];
  }

  static async listPaymentMetrics(): Promise<PaymentMetricRow[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("payments").select("amount_paid");

    if (error) throw error;
    return (data ?? []) as PaymentMetricRow[];
  }

  static async listOrderMetrics(): Promise<OrderMetricRow[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("orders").select("id");

    if (error) throw error;
    return (data ?? []) as OrderMetricRow[];
  }

  static async setRestaurantActive(
    restaurantId: string,
    isActive: boolean
  ): Promise<PlatformRestaurant> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurants")
      .update({ is_active: isActive })
      .eq("id", restaurantId)
      .select("id, name, slug, phone, is_active, created_at")
      .single();

    if (error) throw error;
    return data as PlatformRestaurant;
  }

  /**
   * Phase 6 — Deactivation Cascade.
   *
   * When a restaurant is deactivated, we immediately expire all active
   * customer dining sessions by setting expires_at to NOW(). This ensures:
   *   - No new orders can be placed (session_token RLS policies check expires_at > NOW())
   *   - No new payments can be processed (payment flow requires an active session)
   *   - Existing completed orders and payments are preserved (data immutability)
   *   - Staff dashboard API calls will still work until the staff auth session
   *     expires naturally (Supabase auth JWT), because the restaurant is_active
   *     check happens at the customer-facing public RLS level, not the staff level.
   *
   * Admin-level sessions (staff) are NOT expired here — those are Supabase Auth
   * sessions and must be managed via Supabase Auth Admin API if needed.
   */
  static async expireActiveSessionsForRestaurant(restaurantId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("sessions")
      .update({ expires_at: new Date().toISOString() })
      .eq("restaurant_id", restaurantId)
      .eq("status", "active");

    if (error) throw error;
  }
}


