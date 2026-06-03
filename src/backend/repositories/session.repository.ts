import { createClient } from "@/config/supabase/server";

export class SessionRepository {
  static async findById(sessionId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, restaurant_id, table_id, status, total_amount")
      .eq("id", sessionId)
      .single();

    if (error) throw error;
    return data;
  }

  static async findActiveByTable(tableId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, restaurant_id, table_id, status, total_amount")
      .eq("table_id", tableId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async create(params: {
    restaurantId: string;
    tableId: string;
    guestCount?: number;
  }) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        restaurant_id: params.restaurantId,
        table_id: params.tableId,
        guest_count: params.guestCount ?? 1,
        status: "active",
        total_amount: 0,
      })
      .select("id, restaurant_id, table_id, status, total_amount")
      .single();

    if (error) throw error;
    return data;
  }

  static async addToTotal(sessionId: string, amount: number) {
    const supabase = await createClient();
    const { data: session, error: readError } = await supabase
      .from("sessions")
      .select("total_amount")
      .eq("id", sessionId)
      .single();

    if (readError) throw readError;

    const nextTotal = Number(session.total_amount ?? 0) + amount;
    const { data, error } = await supabase
      .from("sessions")
      .update({ total_amount: nextTotal })
      .eq("id", sessionId)
      .select("id, total_amount")
      .single();

    if (error) throw error;
    return data;
  }
}
