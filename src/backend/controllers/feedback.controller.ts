import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { handleError } from "@/backend/errors/handler";
import { ValidationError } from "@/backend/errors/ValidationError";
import { FeedbackService } from "@/backend/services/feedback.service";
import { feedbackListQuerySchema } from "@/backend/validations/feedback.validation";
import { ok } from "@/backend/utils/apiResponse";

function parseFeedbackQuery(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  try {
    return feedbackListQuerySchema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid query parameters", error.flatten().fieldErrors);
    }
    throw error;
  }
}

export async function getFeedbackDashboard(req: NextRequest) {
  try {
    return ok(await FeedbackService.getDashboard(parseFeedbackQuery(req)));
  } catch (error) {
    return handleError(error);
  }
}

export async function getFeedbackRating(ratingId: string) {
  try {
    return ok(await FeedbackService.getRating(ratingId));
  } catch (error) {
    return handleError(error);
  }
}
