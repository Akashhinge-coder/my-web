"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ORDER_REALTIME_POLL_MS } from "@/config/constants";
import { ApiClientError } from "@/frontend/api/http";
import { ordersApi, type OrderListScope } from "@/frontend/api/orders";

interface UseOrderFeedOptions<T> {
  enabled?: boolean;
  poll?: boolean;
  fetcher: () => Promise<T>;
}

export function useOrderFeed<T>({
  enabled = true,
  poll = true,
  fetcher,
}: UseOrderFeedOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Failed to load orders";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void refresh();

    if (!poll) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, ORDER_REALTIME_POLL_MS);

    return () => window.clearInterval(interval);
  }, [enabled, poll, refresh]);

  return { data, loading, error, refresh, setData };
}

export function useRestaurantOrders(
  restaurantId: string | null,
  scope: OrderListScope = "today"
) {
  return useOrderFeed({
    enabled: Boolean(restaurantId),
    fetcher: () =>
      ordersApi.list({
        restaurantId: restaurantId!,
        scope,
      }) as Promise<unknown[]>,
  });
}

export function useSessionOrders(sessionId: string | null) {
  return useOrderFeed({
    enabled: Boolean(sessionId),
    fetcher: () => ordersApi.listBySession(sessionId!) as Promise<unknown[]>,
  });
}

export function useKitchenOrders(restaurantId: string) {
  return useOrderFeed({
    enabled: Boolean(restaurantId),
    fetcher: () =>
      ordersApi.list({
        restaurantId,
        scope: "kitchen",
      }) as Promise<unknown[]>,
  });
}
