"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/frontend/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline, pendingCount, showBanner } = useOnlineStatus();

  if (!showBanner) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-center text-xs font-medium text-amber-900"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {!isOnline ? (
        <span>You are offline. Orders will sync when connection returns.</span>
      ) : (
        <span>
          {pendingCount} pending action{pendingCount === 1 ? "" : "s"} waiting to sync.
        </span>
      )}
    </div>
  );
}
