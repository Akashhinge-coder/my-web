import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderPricing } from "../../../src/backend/services/pricing.service";

test("calculateOrderPricing applies happy hour, coupon, loyalty, tax, and final total in order", () => {
  const result = calculateOrderPricing({
    items: [
      { id: "dish-1", categoryId: "starters", unitPrice: 200, quantity: 2 },
      { id: "dish-2", categoryId: "mains", unitPrice: 600, quantity: 1 },
    ],
    happyHours: [
      {
        startsAt: "2026-05-30T12:00:00.000Z",
        endsAt: "2026-05-30T13:00:00.000Z",
        percentage: 10,
        categoryIds: ["starters"],
      },
    ],
    coupon: {
      type: "percentage",
      value: 10,
      maxDiscountAmount: 100,
      minimumOrderAmount: 500,
    },
    loyaltyPoints: {
      pointsBalance: 100,
      pointsToRedeem: 100,
      redemptionRate: 0.5,
      maxRedemptionPercent: 10,
    },
    restaurantSettings: {
      cgstRate: 2.5,
      sgstRate: 2.5,
    },
    timestamp: "2026-05-30T12:30:00.000Z",
  });

  assert.deepEqual(result, {
    subtotal: 1000,
    happyHourDiscount: 40,
    couponDiscount: 96,
    loyaltyDiscount: 50,
    taxableAmount: 814,
    cgst: 20.35,
    sgst: 20.35,
    gst: 40.7,
    totalDiscount: 186,
    grandTotal: 854.7,
  });
});
