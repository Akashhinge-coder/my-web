import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { AuthError } from "@/backend/errors/AuthError";
import { SessionRepository } from "@/backend/repositories/session.repository";
import { SessionParticipantRepository } from "@/backend/repositories/session_participant.repository";
import { ok, fail } from "@/backend/utils/apiResponse";

const approveGuestSchema = z.object({
  participantId: z.string().uuid(),
  action: z.enum(["approve", "deny"]),
});

export async function approveGuest(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = approveGuestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid parameters", parsed.error.flatten().fieldErrors);
    }

    const { participantId, action } = parsed.data;
    const cookieStore = cookies();
    const hostToken = cookieStore.get("participant_token")?.value;

    if (!hostToken) {
      return fail("UNAUTHORIZED", "No participant token found", 401);
    }

    // Determine which session the host belongs to
    // First we need to find the host's participant record using their token.
    // However, since we don't have the tableId in this request, we could fetch the participant globally
    // or we could require sessionId in the body.
    // Let's fetch the host's participant record globally by token. Wait, participant_token is UNIQUE but only per session?
    // Oh, the constraint is UNIQUE(session_id, participant_token). So participant_token alone might NOT be unique globally.
    // But since it's a random UUID, statistically it is globally unique. Let's just find the participant by token.

    const { createAdminClient } = await import("@/config/supabase/server");
    const supabase = createAdminClient();

    // 1. Fetch the Host's participant record
    const { data: hostParticipant, error: hostError } = await supabase
      .from("session_participants")
      .select("*")
      .eq("participant_token", hostToken)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (hostError || !hostParticipant) {
      return fail("UNAUTHORIZED", "Invalid participant token", 401);
    }

    // 2. Fetch the target Guest's participant record
    const { data: guestParticipant, error: guestError } = await supabase
      .from("session_participants")
      .select("*")
      .eq("id", participantId)
      .single();

    if (guestError || !guestParticipant) {
      return fail("NOT_FOUND", "Guest not found", 404);
    }

    // 3. Authorization Check: Is the caller the Host of this exact session?
    if (hostParticipant.session_id !== guestParticipant.session_id) {
      return fail("FORBIDDEN", "You are not in the same session", 403);
    }
    
    const { data: session } = await supabase
      .from("sessions")
      .select("host_participant_id")
      .eq("id", hostParticipant.session_id)
      .single();

    if (!session || session.host_participant_id !== hostParticipant.id) {
      return fail("FORBIDDEN", "Only the Host can approve or deny guests", 403);
    }

    // 4. Host Safety Rule: Cannot mutate the Host
    if (guestParticipant.role === "host") {
      return fail("FORBIDDEN", "Cannot approve, deny, or remove the Host", 403);
    }

    // 5. Apply the action
    const status = action === "approve" ? "approved" : "denied";
    await SessionParticipantRepository.updateStatus(participantId, status);

    return ok({ success: true, status });
  } catch (error) {
    return handleError(error);
  }
}
