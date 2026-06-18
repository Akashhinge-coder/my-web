import { createAdminClient } from "@/config/supabase/server";
import { SessionParticipantRole, SessionParticipantStatus, SessionParticipant } from "@/types/domain";

export class SessionParticipantRepository {
  static async findByToken(sessionId: string, participantToken: string): Promise<SessionParticipant | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .eq("participant_token", participantToken)
      .maybeSingle();

    if (error) throw error;
    return data as SessionParticipant | null;
  }

  static async create(params: {
    sessionId: string;
    participantToken: string;
    name: string;
    phone?: string | null;
    role: SessionParticipantRole;
    status: SessionParticipantStatus;
  }): Promise<SessionParticipant> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("session_participants")
      .insert({
        session_id: params.sessionId,
        participant_token: params.participantToken,
        name: params.name,
        phone: params.phone ?? null,
        role: params.role,
        status: params.status,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as SessionParticipant;
  }

  static async updateStatus(id: string, status: SessionParticipantStatus): Promise<void> {
    const supabase = createAdminClient();
    
    const updateData: any = { status };
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'removed' || status === 'denied') {
      updateData.left_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("session_participants")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;
  }

  static async listBySession(sessionId: string): Promise<SessionParticipant[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("session_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as SessionParticipant[];
  }
}
