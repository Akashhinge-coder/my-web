import { createAdminClient } from "@/config/supabase/server";

export class PaymentRepository {
  static async listByRestaurant(restaurantId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("payments").select("*").eq("restaurant_id", restaurantId);
    if (error) throw error;
    return data ?? [];
  }
}
