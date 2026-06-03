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

/**
 * Admin hook — restaurantId is NOT passed to the API.
 * The server derives it from the session. The hook only controls
 * whether the request is enabled (when the session is loaded).
 */
export function useRestaurantOrders(
  sessionLoaded: boolean,
  scope: OrderListScope = "today"
) {
  return useOrderFeed({
    enabled: sessionLoaded,
    fetcher: () =>
      ordersApi.list({ scope }) as Promise<unknown[]>,
  });
}

export function useSessionOrders(sessionId: string | null) {
  return useOrderFeed({
    enabled: Boolean(sessionId),
    fetcher: () => ordersApi.listBySession(sessionId!) as Promise<unknown[]>,
  });
}

/**
 * Kitchen display hook — restaurantId is NOT passed to the API.
 * The server derives it from the session cookie.
 * Kitchen staff must be logged in to use this screen.
 */
export function useKitchenOrders(sessionLoaded: boolean) {
  return useOrderFeed({
    enabled: sessionLoaded,
    fetcher: () =>
      ordersApi.list({ scope: "kitchen" }) as Promise<unknown[]>,
  });
}
