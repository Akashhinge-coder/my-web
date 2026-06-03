import { NextRequest } from "next/server";
import { z } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { SessionRepository } from "@/backend/repositories/session.repository";
import { ok } from "@/backend/utils/apiResponse";

const activeSessionQuerySchema = z.object({
  tableId: z.string().uuid(),
});

export async function getActiveSession(req: NextRequest) {
  try {
    const parsed = activeSessionQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const session = await SessionRepository.findActiveByTable(parsed.data.tableId);
    return ok(session);
  } catch (error) {
    return handleError(error);
  }
}
