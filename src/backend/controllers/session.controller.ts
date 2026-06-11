import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { SessionRepository } from "@/backend/repositories/session.repository";
import { TableRepository } from "@/backend/repositories/table.repository";
import { ok, fail } from "@/backend/utils/apiResponse";



const bootstrapSessionSchema = z.object({
  tableId: z.string().uuid(),
  qrToken: z.string().uuid().optional().nullable(),
});

export async function bootstrapSession(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bootstrapSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid parameters", parsed.error.flatten().fieldErrors);
    }

    const { tableId, qrToken } = parsed.data;
    const cookieStore = cookies();
    const existingToken = cookieStore.get("session_token")?.value;

    // Fetch active session using admin client to include session_token
    const activeSession = await SessionRepository.findActiveByTableWithTokenAdmin(tableId);

    if (activeSession) {
      // Check if client has the matching session token cookie
      if (existingToken && activeSession.session_token === existingToken) {
        return ok({
          sessionId: activeSession.id,
          sessionToken: existingToken,
          status: "active",
        });
      }

      // If client doesn't have it, they must scan the physical QR code (supply qrToken)
      if (!qrToken) {
        return fail("QR_REQUIRED", "Physical QR scan required to join the active table session", 403);
      }

      // Validate qrToken
      const table = await TableRepository.findByIdWithQrTokenAdmin(tableId);
      if (!table || table.qr_token !== qrToken) {
        return fail("INVALID_QR", "Invalid QR code", 400);
      }

      // Join the active session! Set HttpOnly cookie
      cookieStore.set("session_token", activeSession.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 6, // 6 hours
      });

      return ok({
        sessionId: activeSession.id,
        sessionToken: activeSession.session_token,
        status: "active",
      });
    } else {
      // No active session. Must provide a valid qrToken to start a new one!
      if (!qrToken) {
        return fail("QR_REQUIRED", "Physical QR scan required to start a dining session", 403);
      }

      // Validate qrToken
      const table = await TableRepository.findByIdWithQrTokenAdmin(tableId);
      if (!table || table.qr_token !== qrToken) {
        return fail("INVALID_QR", "Invalid QR code", 400);
      }

      // Create new session
      const newSession = await SessionRepository.create({
        restaurantId: table.restaurant_id,
        tableId,
      });

      // Update table to mark occupied and set current_session_id
      await TableRepository.markOccupied(tableId, newSession.id, table.restaurant_id);

      // Set HttpOnly cookie
      cookieStore.set("session_token", newSession.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 6, // 6 hours
      });

      return ok({
        sessionId: newSession.id,
        sessionToken: newSession.session_token,
        status: "active",
      });
    }
  } catch (error) {
    return handleError(error);
  }
}
