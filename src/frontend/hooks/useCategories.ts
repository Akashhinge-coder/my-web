"use client";

import { useCallback, useEffect, useState } from "react";
import { menuApi } from "@/frontend/api/menu";
import type { Category } from "@/types/domain";

export function useCategories(restaurantId: string | null, activeOnly = false) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      setCategories(await menuApi.listCategories(restaurantId, activeOnly));
    } finally {
      setLoading(false);
    }
  }, [restaurantId, activeOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, loading, refresh };
}
