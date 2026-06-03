"use client";

import { useEffect, useState } from "react";
import { getOfflineQueue } from "@/lib/utils";

type QueuedAction = { synced?: boolean };

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setIsOnline(navigator.onLine);
      const queue = getOfflineQueue() as QueuedAction[];
      setPendingCount(queue.filter((action) => !action.synced).length);
    };

    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { isOnline, pendingCount, showBanner: !isOnline || pendingCount > 0 };
}
