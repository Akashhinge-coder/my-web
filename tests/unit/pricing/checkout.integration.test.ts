import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderPricing } from "../../../src/backend/services/pricing.service";
import type { PricingContext } from "../../../src/types/pricing";

const checkoutContext: PricingContext = {
  items: [
    { id: "drink-1", categoryId: "drinks", unitPrice: 200, quantity: 2 },
    { id: "dessert-1", categoryId: "desserts", unitPrice: 150, quantity: 1 },
  ],
  happyHours: [
    {
      id: "drinks-happy-hour",
      startsAt: "2026-05-30T12:00:00.000Z",
      endsAt: "2026-05-30T13:00:00.000Z",
      percentage: 10,
      discountType: "percentage",
      discountValue: 10,
      categoryIds: ["drinks"],
      isActive: true,
    },
  ],
  coupon: {
    type: "percentage",
    value: 10,
    maxDiscountAmount: 50,
    minimumOrderAmount: 400,
  },
  loyaltyPoints: {
    pointsBalance: 100,
    pointsToRedeem: 50,
    redemptionRate: 0.5,
    maxRedemptionPercent: 10,
  },
  restaurantSettings: {
    cgstRate: 2.5,
    sgstRate: 2.5,
  },
  timestamp: "2026-05-30T12:30:00.000Z",
};

test("cart, checkout, and order creation use the same pricing engine result", () => {
  const cartPricing = calculateOrderPricing(checkoutContext);
  const checkoutPricing = calculateOrderPricing(checkoutContext);
  const orderCreationPricing = calculateOrderPricing(checkoutContext);

  assert.deepEqual(checkoutPricing, cartPricing);
  assert.deepEqual(orderCreationPricing, cartPricing);
  assert.deepEqual(cartPricing, {
    subtotal: 550,
    happyHourDiscount: 40,
    couponDiscount: 50,
    loyaltyDiscount: 25,
    taxableAmount: 435,
    cgst: 10.88,
    sgst: 10.88,
    gst: 21.76,
    totalDiscount: 115,
    grandTotal: 456.76,
  });
});
