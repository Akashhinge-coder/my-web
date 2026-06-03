import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { validate } from "@/backend/middleware/validation.middleware";
import { AnalyticsService } from "@/backend/services/analytics.service";
import { analyticsRangeSchema } from "@/backend/validations/analytics.validation";
import { ok } from "@/backend/utils/apiResponse";

function parseRange(req: NextRequest) {
  const raw = { range: req.nextUrl.searchParams.get("range") ?? "7" };
  try {
    return analyticsRangeSchema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid query parameters", error.flatten().fieldErrors);
    }
    throw error;
  }
}

export async function getAnalyticsDashboard(req: NextRequest) {
  try {
    const dto = parseRange(req);
    return ok(await AnalyticsService.getDashboard(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function getAnalyticsSales(req: NextRequest) {
  try {
    const dto = parseRange(req);
    return ok(await AnalyticsService.getSales(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function getAnalyticsOrders(req: NextRequest) {
  try {
    const dto = parseRange(req);
    return ok(await AnalyticsService.getOrders(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function getAnalyticsCustomers(req: NextRequest) {
  try {
    const dto = parseRange(req);
    return ok(await AnalyticsService.getCustomers(dto));
  } catch (error) {
    return handleError(error);
  }
}
