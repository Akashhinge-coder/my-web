import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalyticsDashboard } from "../../../src/backend/mappers/analytics.mapper";
import type { AnalyticsRawData } from "../../../src/backend/repositories/analytics.repository";

test("analytics revenue and discounts use persisted order pricing fields", () => {
  const raw: AnalyticsRawData = {
    orders: [
      {
        id: "order-1",
        subtotal: 550,
        coupon_discount: 50,
        loyalty_discount: 25,
        happy_hour_discount: 40,
        taxable_amount: 435,
        cgst: 10.88,
        sgst: 10.88,
        gst: 21.76,
        total_discount: 115,
        grand_total: 456.76,
        created_at: new Date().toISOString(),
        status: "served",
      },
      {
        id: "order-2",
        subtotal: 300,
        coupon_discount: 0,
        loyalty_discount: 0,
        happy_hour_discount: 0,
        taxable_amount: 300,
        cgst: 7.5,
        sgst: 7.5,
        gst: 15,
        total_discount: 0,
        grand_total: 315,
        created_at: new Date().toISOString(),
        status: "served",
      },
    ],
    payments: [
      {
        amount_paid: 9999,
        method: "cash",
        confirmed_at: new Date().toISOString(),
      },
    ],
    orderItems: [],
    sessions: [],
    ratings: [],
  };

  const dashboard = buildAnalyticsDashboard(raw, 1);

  assert.equal(dashboard.summary.totalRevenue, 771.76);
  assert.equal(dashboard.summary.subtotal, 850);
  assert.equal(dashboard.summary.totalDiscount, 115);
  assert.equal(dashboard.summary.couponDiscount, 50);
  assert.equal(dashboard.summary.loyaltyDiscount, 25);
  assert.equal(dashboard.summary.happyHourDiscount, 40);
  assert.equal(Math.round(dashboard.summary.tax * 100) / 100, 36.76);
  assert.equal(dashboard.dailyData[0].revenue, 771.76);
});
