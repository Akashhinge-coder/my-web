import { createAdminClient } from "@/config/supabase/server";
import type { FeedbackRatingRow } from "@/backend/mappers/feedback.mapper";

const FEEDBACK_SELECT = "id, overall_score, food_score, service_score, comment, created_at, sessions(restaurant_tables(table_number))";

export class FeedbackRepository {
  static async listRatings(restaurantId: string, limit: number): Promise<FeedbackRatingRow[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ratings")
      .select(FEEDBACK_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as unknown as FeedbackRatingRow[];
  }

  static async findRatingById(
    restaurantId: string,
    ratingId: string
  ): Promise<FeedbackRatingRow | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ratings")
      .select(FEEDBACK_SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("id", ratingId)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as FeedbackRatingRow | null;
  }
}
