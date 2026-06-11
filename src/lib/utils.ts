import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merger ────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency formatting ──────────────────────────────────────
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatINRCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

// ── GST calculation ──────────────────────────────────────────
export function calculateGST(
  subtotal: number,
  cgstRate = 2.5,
  sgstRate = 2.5
) {
  const cgst = (subtotal * cgstRate) / 100;
  const sgst = (subtotal * sgstRate) / 100;
  const total = subtotal + cgst + sgst;
  return { subtotal, cgst, sgst, total };
}

// ── Order number generator ───────────────────────────────────
export function generateOrderNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "#";
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ── Invoice number ───────────────────────────────────────────
export function generateInvoiceNumber(restaurantSlug: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${restaurantSlug.toUpperCase().slice(0, 4)}-${yy}${mm}${dd}-${rand}`;
}

export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── QR URL generator ─────────────────────────────────────────
import { getRequestOrigin } from "@/lib/runtime/url";

export function generateQRUrl(
  restaurantSlug: string,
  tableId: string,
  qrToken?: string | null
): string {
  const base = getRequestOrigin();
  return qrToken
    ? `${base}/${restaurantSlug}/${tableId}?qr_token=${qrToken}`
    : `${base}/${restaurantSlug}/${tableId}`;
}

// ── Date formatters ──────────────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

export function formatDateTime(dateStr: string): string {
  return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
}

export function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60)  return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatDate(dateStr);
}

// ── Supabase join helpers ────────────────────────────────────
export function dishNameFromJoin(dishes: unknown, fallback = "Unknown"): string {
  const dish = dishes as { name: string } | { name: string }[] | null;
  if (Array.isArray(dish)) return dish[0]?.name ?? fallback;
  return dish?.name ?? fallback;
}

// ── Food type helpers ────────────────────────────────────────
export function getFoodTypeLabel(type: string): string {
  const map: Record<string, string> = {
    veg:     "Veg",
    non_veg: "Non-Veg",
    vegan:   "Vegan",
    jain:    "Jain",
  };
  return map[type] || type;
}

export function getSpiceLevelLabel(level: number): string {
  const labels = ["No spice", "Mild", "Medium", "Spicy", "Very Spicy", "Extra Hot"];
  return labels[level] || "Medium";
}

export function getSpiceLevelEmoji(level: number): string {
  const emojis = ["", "🌶", "🌶🌶", "🌶🌶🌶", "🌶🌶🌶🌶", "🌶🌶🌶🌶🌶"];
  return emojis[level] || "";
}

// ── WhatsApp helpers ─────────────────────────────────────────
export function generateWhatsAppBillLink(
  phone: string,
  restaurantName: string,
  total: number,
  invoiceUrl?: string
): string {
  const message = encodeURIComponent(
    `🍽️ *${restaurantName}*\n\n` +
    `Your bill: *${formatINR(total)}*\n\n` +
    (invoiceUrl ? `Download invoice: ${invoiceUrl}\n\n` : "") +
    `Thank you for dining with us! 🙏`
  );
  const cleanPhone = phone.replace(/\D/g, "");
  const withCountryCode = cleanPhone.startsWith("91")
    ? cleanPhone
    : `91${cleanPhone}`;
  return `https://wa.me/${withCountryCode}?text=${message}`;
}

export function generateWhatsAppEODReport(
  phone: string,
  restaurantName: string,
  stats: {
    date: string;
    revenue: number;
    orders: number;
    covers: number;
    topDish: string;
    upi: number;
    cash: number;
    card: number;
  }
): string {
  const message = encodeURIComponent(
    `📊 *MENUARA Daily Report*\n` +
    `🏪 ${restaurantName}\n` +
    `📅 ${stats.date}\n\n` +
    `💰 Revenue: *${formatINR(stats.revenue)}*\n` +
    `📦 Orders: *${stats.orders}*\n` +
    `👥 Covers: *${stats.covers}*\n\n` +
    `🏆 Top dish: ${stats.topDish}\n\n` +
    `💳 Payments:\n` +
    `   UPI: ${formatINR(stats.upi)}\n` +
    `   Cash: ${formatINR(stats.cash)}\n` +
    `   Card: ${formatINR(stats.card)}`
  );
  const cleanPhone = phone.replace(/\D/g, "");
  const withCountryCode = cleanPhone.startsWith("91")
    ? cleanPhone
    : `91${cleanPhone}`;
  return `https://wa.me/${withCountryCode}?text=${message}`;
}

// ── Validation ───────────────────────────────────────────────
export function validatePhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ""));
}

export function validateGST(gst: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Local storage helpers ────────────────────────────────────
export function getCartFromStorage(tableId: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`menuara_cart_${tableId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCartToStorage(tableId: string, cart: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`menuara_cart_${tableId}`, JSON.stringify(cart));
  } catch {
    // Storage might be full
  }
}

// ── Offline queue helpers ────────────────────────────────────
export function queueOfflineAction(action: {
  type: string;
  payload: unknown;
}): void {
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(
      localStorage.getItem("menuara_offline_queue") || "[]"
    );
    existing.push({
      id: crypto.randomUUID(),
      ...action,
      timestamp: new Date().toISOString(),
      synced: false,
    });
    localStorage.setItem("menuara_offline_queue", JSON.stringify(existing));
  } catch {
    // Ignore
  }
}

export function getOfflineQueue(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem("menuara_offline_queue") || "[]"
    );
  } catch {
    return [];
  }
}

export function clearSyncedActions(): void {
  if (typeof window === "undefined") return;
  try {
    const queue = getOfflineQueue() as Array<{ synced: boolean }>;
    const pending = queue.filter((a) => !a.synced);
    localStorage.setItem("menuara_offline_queue", JSON.stringify(pending));
  } catch {
    // Ignore
  }
}

// ── Image Source Validator ───────────────────────────────────
export function isValidImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  
  if (src.startsWith("/") || src.startsWith("data:")) return true;
  
  try {
    const url = new URL(src);
    const host = url.hostname;
    
    if (host === "res.cloudinary.com") return true;
    if (host === "images.unsplash.com") return true;
    if (host.endsWith(".supabase.co")) return true;
    if (host.endsWith(".bing.net")) return true;
    if (host.endsWith(".mm.bing.net")) return true;
    
    return false;
  } catch {
    return false;
  }
}
