import { createClient } from "@/config/supabase/server";
import type {
  IntegrationsOrderItemRow,
  IntegrationsOrderRow,
  IntegrationsPaymentRow,
  IntegrationsSessionRow,
} from "@/backend/mappers/integrations.mapper";

export class IntegrationsRepository {
  static async listOrdersSince(
    restaurantId: string,
    fromISO: string
  ): Promise<IntegrationsOrderRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("id, grand_total")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", fromISO)
      .neq("status", "cancelled");

    if (error) throw error;
    return (data ?? []) as IntegrationsOrderRow[];
  }

  static async listPaymentsSince(
    restaurantId: string,
    fromISO: string
  ): Promise<IntegrationsPaymentRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payments")
      .select("amount, payment_method")
      .eq("restaurant_id", restaurantId)
      .eq("payment_status", "captured")
      .gte("paid_at", fromISO);

    if (error) throw error;
    return (data ?? []) as IntegrationsPaymentRow[];
  }

  static async listSessionsSince(
    restaurantId: string,
    fromISO: string
  ): Promise<IntegrationsSessionRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("guest_count")
      .eq("restaurant_id", restaurantId)
      .gte("started_at", fromISO);

    if (error) throw error;
    return (data ?? []) as IntegrationsSessionRow[];
  }

  static async listOrderItems(orderIds: string[]): Promise<IntegrationsOrderItemRow[]> {
    if (orderIds.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("order_items")
      .select("quantity, dishes(name)")
      .in("order_id", orderIds);

    if (error) throw error;
    return (data ?? []) as IntegrationsOrderItemRow[];
  }
}
