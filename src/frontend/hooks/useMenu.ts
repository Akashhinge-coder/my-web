"use client";

import { useCallback, useEffect, useState } from "react";
import { menuApi } from "@/frontend/api/menu";
import type { AdminMenuBundle, CustomerMenuBundle } from "@/types/menu";

export function useCustomerMenu(slug: string | null, tableId: string | null) {
  const [data, setData] = useState<CustomerMenuBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!slug || !tableId) return;
    setLoading(true);
    try {
      setData(await menuApi.getCustomerMenu(slug, tableId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [slug, tableId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAdminMenu(restaurantId: string | null) {
  const [data, setData] = useState<AdminMenuBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      setData(await menuApi.getAdminMenu(restaurantId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
