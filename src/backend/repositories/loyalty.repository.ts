import { createClient } from "@/config/supabase/server";

export interface LoyaltyAccountRow {
  id: string;
  restaurant_id: string;
  phone: string;
  name: string | null;
  total_points: number;
  available_points: number;
  total_spent: number | string;
  visit_count: number;
  last_visited: string | null;
}

export interface LoyaltySettingsRow {
  restaurant_id: string;
  earn_enabled: boolean;
  redeem_enabled: boolean;
  base_points_per_hundred: number;
  minimum_points_to_redeem: number;
  redemption_rate: number;
  max_redemption_percent: number;
}

const LOYALTY_SELECT = "id, restaurant_id, phone, name, total_points, available_points, total_spent, visit_count, last_visited";

export class LoyaltyRepository {
  static async listAccounts(restaurantId: string): Promise<LoyaltyAccountRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select(LOYALTY_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("total_points", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LoyaltyAccountRow[];
  }

  static async findAccountByPhone(restaurantId: string, phone: string): Promise<LoyaltyAccountRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .select(LOYALTY_SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    return data as LoyaltyAccountRow | null;
  }

  static async ensureAccount(restaurantId: string, phone: string, name?: string | null): Promise<LoyaltyAccountRow> {
    const supabase = await createClient();
    
    // First try to find it
    const existing = await this.findAccountByPhone(restaurantId, phone);
    if (existing) {
      if (name && !existing.name) {
        const { data, error } = await supabase
          .from("loyalty_accounts")
          .update({ name })
          .eq("id", existing.id)
          .select(LOYALTY_SELECT)
          .single();
        if (!error && data) return data as LoyaltyAccountRow;
      }
      return existing;
    }

    // Otherwise create it
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .insert({
        restaurant_id: restaurantId,
        phone,
        name: name || null,
        total_points: 0,
        available_points: 0,
        pending_points: 0,
        total_spent: 0,
        visit_count: 1,
      })
      .select(LOYALTY_SELECT)
      .single();

    if (error) {
      // If it failed because of a concurrent insert (unique constraint), just fetch it again
      if (error.code === '23505') {
        const raceConditionExisting = await this.findAccountByPhone(restaurantId, phone);
        if (raceConditionExisting) return raceConditionExisting;
      }
      throw error;
    }
    return data as LoyaltyAccountRow;
  }

  static async updatePoints(
    restaurantId: string,
    accountId: string,
    nextPoints: number
  ): Promise<LoyaltyAccountRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_accounts")
      .update({ available_points: nextPoints, total_points: nextPoints, last_visited: new Date().toISOString() })
      .eq("restaurant_id", restaurantId)
      .eq("id", accountId)
      .select(LOYALTY_SELECT)
      .single();

    if (error) throw error;
    return data as LoyaltyAccountRow;
  }

  static async redeemPointsAtomic(
    restaurantId: string,
    accountId: string,
    pointsToRedeem: number
  ): Promise<LoyaltyAccountRow | null> {
    const supabase = await createClient();
    
    // Call the atomic postgres function
    const { data: updatedAvailablePoints, error } = await supabase.rpc("redeem_loyalty_points", {
      p_account_id: accountId,
      p_redeem_amount: pointsToRedeem
    });

    if (error) throw error;

    if (updatedAvailablePoints === null) {
      return null; // Atomic check failed (not enough points)
    }

    // Since the RPC doesn't return the full row, we fetch it immediately after.
    // The RPC guaranteed the points were atomically deducted.
    const { data: updatedRow, error: fetchError } = await supabase
      .from("loyalty_accounts")
      .update({ last_visited: new Date().toISOString() }) // Just updating last visited
      .eq("restaurant_id", restaurantId)
      .eq("id", accountId)
      .select(LOYALTY_SELECT)
      .single();

    if (fetchError) throw fetchError;
    return updatedRow as LoyaltyAccountRow;
  }

  static async getSettings(restaurantId: string): Promise<LoyaltySettingsRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_settings")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (error) throw error;
    return data as LoyaltySettingsRow | null;
  }

  static async upsertSettings(restaurantId: string, settings: Partial<LoyaltySettingsRow>): Promise<LoyaltySettingsRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("loyalty_settings")
      .upsert({ restaurant_id: restaurantId, ...settings })
      .select("*")
      .single();

    if (error) throw error;
    return data as LoyaltySettingsRow;
  }

  static async recordTransaction(
    restaurantId: string,
    accountId: string,
    type: string,
    source: string,
    sourceReference: string | null,
    points: number,
    orderId: string | null = null,
    staffId: string | null = null,
    reason: string | null = null
  ): Promise<any> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_loyalty_transaction", {
      p_restaurant_id: restaurantId,
      p_account_id: accountId,
      p_type: type,
      p_source: source,
      p_source_reference: sourceReference,
      p_points: points,
      p_order_id: orderId,
      p_staff_id: staffId,
      p_reason: reason
    });

    if (error) throw error;
    return data;
  }

  static async listTransactions(
    restaurantId: string,
    options?: { accountId?: string; limit?: number; offset?: number }
  ): Promise<any[]> {
    const supabase = await createClient();
    let query = supabase
      .from("loyalty_transactions")
      .select("*, loyalty_accounts(phone, name)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (options?.accountId) {
      query = query.eq("account_id", options.accountId);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  static async updateSettings(restaurantId: string, updates: any): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("loyalty_settings")
      .upsert(
        { restaurant_id: restaurantId, ...updates },
        { onConflict: "restaurant_id" }
      );
    if (error) throw error;
  }
}
