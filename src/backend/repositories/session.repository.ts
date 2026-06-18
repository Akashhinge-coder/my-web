import { createClient, createAdminClient } from "@/config/supabase/server";

export class SessionRepository {
  static async findById(sessionId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, restaurant_id, table_id, status, total_amount, host_participant_id, session_mode_snapshot")
      .eq("id", sessionId)
      .single();

    if (error) throw error;
    return data;
  }

  static async findActiveByTable(tableId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, restaurant_id, table_id, status, total_amount, host_participant_id, session_mode_snapshot")
      .eq("table_id", tableId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Looks up a session by its opaque session_token cookie value.
   * Uses the service-role admin client because session_token is a secret column.
   * Returns ANY session (active or not) — the caller is responsible for
   * validating status, table ownership, and restaurant ownership.
   */
  static async findByToken(token: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, restaurant_id, table_id, status, total_amount, session_token, expires_at, host_participant_id, session_mode_snapshot")
      .eq("session_token", token)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findActiveByTableWithTokenAdmin(tableId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, restaurant_id, table_id, status, total_amount, session_token, host_participant_id, session_mode_snapshot")
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
    sessionModeSnapshot: "open" | "host_approval";
    guestCount?: number;
  }) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        restaurant_id: params.restaurantId,
        table_id: params.tableId,
        guest_count: params.guestCount ?? 1,
        status: "active",
        total_amount: 0,
        session_mode_snapshot: params.sessionModeSnapshot,
      })
      .select("id, restaurant_id, table_id, status, total_amount, session_token, host_participant_id, session_mode_snapshot")
      .single();

    if (error) throw error;
    return data;
  }

  static async updateHostParticipant(sessionId: string, hostParticipantId: string) {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("sessions")
      .update({ host_participant_id: hostParticipantId })
      .eq("id", sessionId);

    if (error) throw error;
  }

  static async addToTotal(sessionId: string, amount: number) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .rpc("increment_session_total", {
        p_session_id: sessionId,
        p_amount: amount,
      });

    if (error) throw error;
    return { id: sessionId, total_amount: data };
  }
}
