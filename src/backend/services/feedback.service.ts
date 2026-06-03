import { NotFoundError } from "@/backend/errors/NotFoundError";
import {
  buildFeedbackSummary,
  mapFeedbackRating,
  type FeedbackDashboardDTO,
  type FeedbackRatingDTO,
} from "@/backend/mappers/feedback.mapper";
import { FeedbackRepository } from "@/backend/repositories/feedback.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { FeedbackListQueryDTO } from "@/backend/validations/feedback.validation";

export class FeedbackService {
  static async getDashboard(dto: FeedbackListQueryDTO): Promise<FeedbackDashboardDTO> {
    const access = await resolveRestaurantAccess();
    const ratings = (await FeedbackRepository.listRatings(access.restaurantId, dto.limit)).map(
      mapFeedbackRating
    );

    return {
      summary: buildFeedbackSummary(ratings),
      ratings,
    };
  }

  static async getRating(ratingId: string): Promise<FeedbackRatingDTO> {
    const access = await resolveRestaurantAccess();
    const rating = await FeedbackRepository.findRatingById(access.restaurantId, ratingId);
    if (!rating) throw new NotFoundError("Feedback rating not found");
    return mapFeedbackRating(rating);
  }
}
