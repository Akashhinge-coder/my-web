"use client";

import { useCallback, useEffect, useState } from "react";
import { menuApi } from "@/frontend/api/menu";
import { restaurantsApi } from "@/frontend/api/restaurants";
import type { CustomerDish, DishArViewPayload } from "@/types/menu";
import type { DishARAsset } from "@/types/domain";

export function useDish(
  restaurantId: string | null,
  dishId: string | null,
  options?: { includeAr?: boolean }
) {
  const [dish, setDish] = useState<CustomerDish | null>(null);
  const [arAsset, setArAsset] = useState<DishARAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!restaurantId || !dishId) return;
    setLoading(true);
    try {
      if (options?.includeAr) {
        const result: DishArViewPayload = await menuApi.getDishAr(restaurantId, dishId);
        setDish(result.dish);
        setArAsset(result.arAsset);
      } else {
        const result = await menuApi.getDish(restaurantId, dishId);
        setDish(result);
        setArAsset(null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dish");
    } finally {
      setLoading(false);
    }
  }, [restaurantId, dishId, options?.includeAr]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dish, arAsset, loading, error, refresh };
}

/** Customer AR viewer: resolves restaurant from slug, loads dish + AR via API. */
export function useCustomerDishAr(slug: string | null, dishId: string | null) {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loadingSlug, setLoadingSlug] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoadingSlug(false);
      return;
    }

    let cancelled = false;
    restaurantsApi
      .getBySlug(slug)
      .then((r) => {
        if (!cancelled) setRestaurantId(r.id);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlug(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const dishState = useDish(restaurantId, dishId, { includeAr: true });

  return {
    ...dishState,
    restaurantId,
    loading: loadingSlug || dishState.loading,
  };
}
