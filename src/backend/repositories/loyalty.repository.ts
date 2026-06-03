import { createAdminClient } from "@/config/supabase/server";

export interface LoyaltyAccountRow {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string | null;
  total_points: number;
  total_spent: number | string;
  visit_count: number;
  last_visited: string | null;
}

const LOYALTY_SELECT = "id, restaurant_id, phone, name, total_points, total_spent, visit_count, last_visited";

export class LoyaltyRepository {
  static async listAccounts(restaurantId: string): Promise<LoyaltyAccountRow[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select(LOYALTY_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("total_points", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LoyaltyAccountRow[];
  }

  static async findAccountByPhone(restaurantId: string, phone: string): Promise<LoyaltyAccountRow | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select(LOYALTY_SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    return data as LoyaltyAccountRow | null;
  }

  static async updatePoints(
    restaurantId: string,
    accountId: string,
    nextPoints: number
  ): Promise<LoyaltyAccountRow> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .update({ total_points: nextPoints, last_visited: new Date().toISOString() })
      .eq("restaurant_id", restaurantId)
      .eq("id", accountId)
      .select(LOYALTY_SELECT)
      .single();

    if (error) throw error;
    return data as LoyaltyAccountRow;
  }
}
