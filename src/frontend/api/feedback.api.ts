import { apiFetch } from "@/frontend/api/http";

export interface FeedbackRating {
  id: string;
  overall_score: number;
  food_score: number;
  service_score: number;
  comment: string | null;
  created_at: string;
  sessions: { restaurant_tables: { table_number: string } | null } | null;
}

export interface FeedbackSummary {
  totalReviews: number;
  avgOverall: number;
  avgFood: number;
  avgService: number;
  distribution: Array<{ score: number; count: number; pct: number }>;
}

export interface FeedbackDashboard {
  summary: FeedbackSummary;
  ratings: FeedbackRating[];
}

export const feedbackApi = {
  getAll(limit = 50) {
    const search = new URLSearchParams({ limit: String(limit) });
    return apiFetch<FeedbackDashboard>(`/api/v1/feedback?${search}`);
  },

  getById(id: string) {
    return apiFetch<FeedbackRating>(`/api/v1/feedback/${id}`);
  },
};
