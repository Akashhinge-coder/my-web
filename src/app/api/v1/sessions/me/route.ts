import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/config/supabase/server";
import { ok, fail } from "@/backend/utils/apiResponse";
import { handleError } from "@/backend/errors/handler";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("participant_token")?.value;

    if (!token) {
      return fail("UNAUTHORIZED", "No active session participant", 401);
    }

    const supabase = createAdminClient();

    // Fetch the participant
    const { data: participant, error } = await supabase
      .from("session_participants")
      .select("*, sessions(host_participant_id, table_id, restaurant_id)")
      .eq("participant_token", token)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !participant) {
      return fail("UNAUTHORIZED", "Participant not found", 401);
    }

    const role = participant.role;
    const status = participant.status;
    let pendingGuests: any[] = [];

    // If Host, fetch pending guests
    if (role === "host") {
      const { data: guests, error: guestsError } = await supabase
        .from("session_participants")
        .select("id, name, phone, created_at")
        .eq("session_id", participant.session_id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (!guestsError && guests) {
        pendingGuests = guests;
      }
    }

    return ok({
      id: participant.id,
      name: participant.name,
      role,
      status,
      sessionId: participant.session_id,
      tableId: participant.sessions?.table_id,
      restaurantId: participant.sessions?.restaurant_id,
      pendingGuests: role === "host" ? pendingGuests : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
