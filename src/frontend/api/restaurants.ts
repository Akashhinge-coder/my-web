import { apiFetch } from "@/frontend/api/http";

export interface RestaurantSummary {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active?: boolean;
}

export const restaurantsApi = {
  getBySlug(slug: string) {
    return apiFetch<RestaurantSummary>(`/api/v1/restaurants?slug=${encodeURIComponent(slug)}`);
  },

  getById(id: string) {
    return apiFetch<RestaurantSummary>(`/api/v1/restaurants?id=${id}`);
  },

  getContext() {
    return apiFetch<RestaurantSummary>("/api/v1/restaurants/context");
  },
};
