import assert from "node:assert/strict";
import test from "node:test";
import { combineOrderPricing } from "../../../src/backend/services/pricing.service";

test("billing invoice totals are summed from persisted checkout pricing", () => {
  const invoicePricing = combineOrderPricing([
    {
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
    },
    {
      subtotal: 300,
      happyHourDiscount: 0,
      couponDiscount: 0,
      loyaltyDiscount: 0,
      taxableAmount: 300,
      cgst: 7.5,
      sgst: 7.5,
      gst: 15,
      totalDiscount: 0,
      grandTotal: 315,
    },
  ]);

  assert.deepEqual(invoicePricing, {
    subtotal: 850,
    happyHourDiscount: 40,
    couponDiscount: 50,
    loyaltyDiscount: 25,
    taxableAmount: 735,
    cgst: 18.38,
    sgst: 18.38,
    gst: 36.76,
    totalDiscount: 115,
    grandTotal: 771.76,
  });
});
