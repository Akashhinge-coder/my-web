export const GST_RATES = {
  cgst: 2.5,
  sgst: 2.5,
} as const;

export const ORDER_LIMITS = {
  maxItemsPerOrder: 30,
  maxQuantityPerItem: 50,
} as const;

export const APP_NAME = "MENUARA";

/** Polling interval for live order feeds (replaces client Supabase realtime). */
export const ORDER_REALTIME_POLL_MS = 4_000;
