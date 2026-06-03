import { dishNameFromJoin } from "@/lib/utils";
import type {
  AnalyticsCustomersReport,
  AnalyticsDashboard,
  AnalyticsDayData,
  AnalyticsDishData,
  AnalyticsOrdersReport,
  AnalyticsPaymentData,
  AnalyticsPeakHour,
  AnalyticsSalesReport,
  AnalyticsSummary,
} from "@/types/analytics";
import type { AnalyticsRawData } from "@/backend/repositories/analytics.repository";

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function buildDayMap(days: number): Record<string, { revenue: number; orders: number }> {
  const dayMap: Record<string, { revenue: number; orders: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dayMap[key] = { revenue: 0, orders: 0 };
  }
  return dayMap;
}

function buildSummary(raw: AnalyticsRawData): AnalyticsSummary {
  const subtotal = raw.orders.reduce((s, o) => s + toNumber(o.subtotal), 0);
  const couponDiscount = raw.orders.reduce((s, o) => s + toNumber(o.coupon_discount), 0);
  const loyaltyDiscount = raw.orders.reduce((s, o) => s + toNumber(o.loyalty_discount), 0);
  const happyHourDiscount = raw.orders.reduce((s, o) => s + toNumber(o.happy_hour_discount), 0);
  const totalDiscount = raw.orders.reduce((s, o) => s + toNumber(o.total_discount), 0);
  const taxableAmount = raw.orders.reduce((s, o) => s + toNumber(o.taxable_amount), 0);
  const tax = raw.orders.reduce((s, o) => s + toNumber(o.gst), 0);
  const totalRevenue = raw.orders.reduce((s, o) => s + toNumber(o.grand_total), 0);
  const totalOrders = raw.orders.length;
  const totalCovers = raw.sessions.reduce((s, sess) => s + toNumber(sess.guest_count), 0);
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgRating =
    raw.ratings.length > 0
      ? raw.ratings.reduce((s, r) => s + toNumber(r.overall_score), 0) / raw.ratings.length
      : 0;

  return {
    totalRevenue,
    subtotal,
    totalDiscount,
    couponDiscount,
    loyaltyDiscount,
    happyHourDiscount,
    tax,
    taxableAmount,
    totalOrders,
    totalCovers,
    avgOrder,
    avgRating,
  };
}

function buildDailyData(raw: AnalyticsRawData, days: number): AnalyticsDayData[] {
  const dayMap = buildDayMap(days);

  raw.orders.forEach((o) => {
    const key = o.created_at.split("T")[0];
    if (dayMap[key]) {
      dayMap[key].revenue += toNumber(o.grand_total);
      dayMap[key].orders++;
    }
  });

  return Object.entries(dayMap).map(([date, d]) => ({ date, ...d }));
}

function buildTopDishes(raw: AnalyticsRawData): AnalyticsDishData[] {
  const dishMap: Record<string, AnalyticsDishData> = {};

  raw.orderItems.forEach((item) => {
    const dishName = dishNameFromJoin(item.dishes);
    if (!dishMap[dishName]) dishMap[dishName] = { name: dishName, count: 0, revenue: 0 };
    dishMap[dishName].count += toNumber(item.quantity);
    dishMap[dishName].revenue += toNumber(item.total_price);
  });

  return Object.values(dishMap).sort((a, b) => b.count - a.count).slice(0, 8);
}

function buildPaymentData(raw: AnalyticsRawData): AnalyticsPaymentData[] {
  const pmMap: Record<string, { amount: number; count: number }> = {};

  raw.payments.forEach((p) => {
    const method = p.method ?? "unknown";
    if (!pmMap[method]) pmMap[method] = { amount: 0, count: 0 };
    pmMap[method].amount += toNumber(p.amount_paid);
    pmMap[method].count++;
  });

  return Object.entries(pmMap)
    .map(([method, d]) => ({ method, ...d }))
    .sort((a, b) => b.amount - a.amount);
}

function buildPeakHours(raw: AnalyticsRawData): AnalyticsPeakHour[] {
  const hourMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;

  raw.orders.forEach((o) => {
    const hour = new Date(o.created_at).getHours();
    hourMap[hour]++;
  });

  return Object.entries(hourMap).map(([h, count]) => ({
    hour: parseInt(h, 10),
    count,
  }));
}

export function buildAnalyticsDashboard(raw: AnalyticsRawData, days: number): AnalyticsDashboard {
  const summary = buildSummary(raw);
  return {
    summary,
    dailyData: buildDailyData(raw, days),
    topDishes: buildTopDishes(raw),
    paymentData: buildPaymentData(raw),
    peakHours: buildPeakHours(raw),
  };
}

export function buildSalesReport(raw: AnalyticsRawData, days: number): AnalyticsSalesReport {
  const summary = buildSummary(raw);
  return {
    totalRevenue: summary.totalRevenue,
    subtotal: summary.subtotal,
    totalDiscount: summary.totalDiscount,
    couponDiscount: summary.couponDiscount,
    loyaltyDiscount: summary.loyaltyDiscount,
    happyHourDiscount: summary.happyHourDiscount,
    tax: summary.tax,
    taxableAmount: summary.taxableAmount,
    avgOrder: summary.avgOrder,
    dailyData: buildDailyData(raw, days),
    paymentData: buildPaymentData(raw),
  };
}

export function buildOrdersReport(raw: AnalyticsRawData, days: number): AnalyticsOrdersReport {
  const summary = buildSummary(raw);
  return {
    totalOrders: summary.totalOrders,
    avgOrder: summary.avgOrder,
    dailyData: buildDailyData(raw, days),
    topDishes: buildTopDishes(raw),
    peakHours: buildPeakHours(raw),
  };
}

export function buildCustomersReport(raw: AnalyticsRawData): AnalyticsCustomersReport {
  const summary = buildSummary(raw);
  return {
    totalCovers: summary.totalCovers,
    avgRating: summary.avgRating,
    ratingCount: raw.ratings.length,
  };
}
