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
}

