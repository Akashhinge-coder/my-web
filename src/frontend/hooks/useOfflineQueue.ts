import { getOfflineQueue, queueOfflineAction } from "@/lib/utils";

export function useOfflineQueue() {
  return { getOfflineQueue, queueOfflineAction };
}
