export interface FeedbackRatingRow {
  id: string;
  overall_score: number;
  food_score: number;
  service_score: number;
  comment: string | null;
  created_at: string;
  sessions: { restaurant_tables: { table_number: string } | null } | null;
}

export interface FeedbackRatingDTO {
  id: string;
  overall_score: number;
  food_score: number;
  service_score: number;
  comment: string | null;
  created_at: string;
  sessions: { restaurant_tables: { table_number: string } | null } | null;
}

export interface FeedbackSummaryDTO {
  totalReviews: number;
  avgOverall: number;
  avgFood: number;
  avgService: number;
  distribution: Array<{ score: number; count: number; pct: number }>;
}

export interface FeedbackDashboardDTO {
  summary: FeedbackSummaryDTO;
  ratings: FeedbackRatingDTO[];
}

export function mapFeedbackRating(row: FeedbackRatingRow): FeedbackRatingDTO {
  return {
    id: row.id,
    overall_score: Number(row.overall_score),
    food_score: Number(row.food_score),
    service_score: Number(row.service_score),
    comment: row.comment,
    created_at: row.created_at,
    sessions: row.sessions,
  };
}

export function buildFeedbackSummary(ratings: FeedbackRatingDTO[]): FeedbackSummaryDTO {
  const totalReviews = ratings.length;
  const avg = (key: keyof Pick<FeedbackRatingDTO, "overall_score" | "food_score" | "service_score">) => {
    if (totalReviews === 0) return 0;
    return ratings.reduce((sum, rating) => sum + rating[key], 0) / totalReviews;
  };

  return {
    totalReviews,
    avgOverall: avg("overall_score"),
    avgFood: avg("food_score"),
    avgService: avg("service_score"),
    distribution: [5, 4, 3, 2, 1].map((score) => {
      const count = ratings.filter((rating) => rating.overall_score === score).length;
      return {
        score,
        count,
        pct: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
      };
    }),
  };
}
