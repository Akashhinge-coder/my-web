import { ORDER_REALTIME_POLL_MS } from "@/config/constants";

/**
 * Live order feeds are delivered to clients via polling against the orders API.
 * Interval and visibility rules are centralized here so UI hooks stay thin.
 */
export class OrderRealtimeService {
  static getPollIntervalMs() {
    return ORDER_REALTIME_POLL_MS;
  }

  static shouldPoll(documentVisible: boolean) {
    return documentVisible;
  }
}
