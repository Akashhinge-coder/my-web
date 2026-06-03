import { apiFetch } from "@/frontend/api/http";
import type { PlatformDashboard, PlatformRestaurant } from "@/types/platform";

export const platformApi = {
  getDashboard(): Promise<PlatformDashboard> {
    return apiFetch<PlatformDashboard>("/api/v1/platform");
  },

  setRestaurantActive(
    restaurantId: string,
    isActive: boolean
  ): Promise<PlatformRestaurant> {
    return apiFetch<PlatformRestaurant>("/api/v1/platform", {
      method: "PATCH",
      body: JSON.stringify({ restaurantId, isActive }),
    });
  },
};

