"use client";

import { useEffect, useState } from "react";
import { restaurantsApi } from "@/frontend/api/restaurants";

export function useAdminRestaurant() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    restaurantsApi
      .getContext()
      .then((restaurant) => {
        if (!cancelled) setRestaurantId(restaurant.id);
      })
      .catch(() => {
        if (!cancelled) setRestaurantId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { restaurantId, loading };
}
