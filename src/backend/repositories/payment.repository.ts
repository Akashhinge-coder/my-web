import { createClient } from "@/config/supabase/server";

export class PaymentRepository {
  static async listByRestaurant(restaurantId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("payments").select("*").eq("restaurant_id", restaurantId);
    if (error) throw error;
    return data ?? [];
  }
}
