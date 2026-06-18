import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { SessionRepository } from "@/backend/repositories/session.repository";
import { TableRepository } from "@/backend/repositories/table.repository";
import { RestaurantRepository } from "@/backend/repositories/restaurant.repository";
import { SessionParticipantRepository } from "@/backend/repositories/session_participant.repository";
import { ok, fail } from "@/backend/utils/apiResponse";

const bootstrapSessionSchema = z.object({
  tableId: z.string().uuid(),
  qrToken: z.string().uuid().optional().nullable(),
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
});

export async function bootstrapSession(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bootstrapSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid parameters", parsed.error.flatten().fieldErrors);
    }

    const { tableId, qrToken, name, phone } = parsed.data;
    const cookieStore = cookies();
    const existingParticipantToken = cookieStore.get("participant_token")?.value;

    const table = await TableRepository.findByIdWithQrTokenAdmin(tableId);
    if (!table) {
      return fail("NOT_FOUND", "Table not found", 404);
    }

    // Physical QR code scan required
    if (!qrToken || table.qr_token !== qrToken) {
      return fail("INVALID_QR", "Physical QR scan required to start or join a dining session", 403);
    }

    const restaurant = await RestaurantRepository.getSettingsById(table.restaurant_id);
    const sessionMode = restaurant.session_mode ?? "open";

    // Fetch active session
    const activeSession = await SessionRepository.findActiveByTableWithTokenAdmin(tableId);

    // 1. Idempotency Check: if they already have a cookie and are part of the active session
    if (activeSession && existingParticipantToken) {
      const existingParticipant = await SessionParticipantRepository.findByToken(activeSession.id, existingParticipantToken);
      if (existingParticipant) {
        // Return existing state without creating a new participant
        return ok({
          sessionId: activeSession.id,
          status: existingParticipant.status,
          role: existingParticipant.role,
        });
      }
    }

    // 2. We are creating a new participant. Name is required.
    if (!name || name.trim() === "") {
       return fail("VALIDATION_ERROR", "Name is required to join the table", 400);
    }

    const participantToken = crypto.randomUUID();

    if (!activeSession) {
      // Start a completely new session (User becomes Host)
      const newSession = await SessionRepository.create({
        restaurantId: table.restaurant_id,
        tableId,
        sessionModeSnapshot: sessionMode,
      });

      const participant = await SessionParticipantRepository.create({
        sessionId: newSession.id,
        participantToken,
        name: name.trim(),
        phone: phone ?? null,
        role: "host",
        status: "approved"
      });

      await SessionRepository.updateHostParticipant(newSession.id, participant.id);
      await TableRepository.markOccupied(tableId, newSession.id, table.restaurant_id);

      cookieStore.set("participant_token", participantToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 6, // 6 hours
        path: "/",
      });

      return ok({
        sessionId: newSession.id,
        status: "approved",
        role: "host",
      });
    } else {
      // Active session exists (User becomes Guest)
      const snapshotMode = activeSession.session_mode_snapshot ?? "open";
      const status = snapshotMode === "host_approval" ? "pending" : "approved";

      const participant = await SessionParticipantRepository.create({
        sessionId: activeSession.id,
        participantToken,
        name: name.trim(),
        phone: phone ?? null,
        role: "guest",
        status,
      });

      cookieStore.set("participant_token", participantToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 6,
        path: "/",
      });

      return ok({
        sessionId: activeSession.id,
        status: participant.status,
        role: participant.role,
      });
    }
  } catch (error) {
    return handleError(error);
  }
}
