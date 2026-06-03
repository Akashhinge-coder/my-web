import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { IntegrationsService } from "@/backend/services/integrations.service";
import { integrationsStatsQuerySchema } from "@/backend/validations/integrations.validation";
import { ok } from "@/backend/utils/apiResponse";

function parseIntegrationsQuery(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  try {
    return integrationsStatsQuerySchema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid query parameters", error.flatten().fieldErrors);
    }
    throw error;
  }
}

export async function getIntegrationsDashboard(req: NextRequest) {
  try {
    return ok(await IntegrationsService.getDashboard(parseIntegrationsQuery(req)));
  } catch (error) {
    return handleError(error);
  }
}

export async function getIntegrationsStats(req: NextRequest) {
  try {
    return ok(await IntegrationsService.getStats(parseIntegrationsQuery(req)));
  } catch (error) {
    return handleError(error);
  }
}
