"use client";

import { useEffect } from "react";
import { createClient } from "@/config/supabase/client";

/**
 * Subscribes to restaurant_tables changes for the given restaurant.
 * Keeps Supabase realtime out of page components.
 */
export function useTablesRealtime(
  restaurantId: string | null,
  onRefresh: () => void
) {
  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`tables-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, onRefresh]);
}
