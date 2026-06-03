import assert from "node:assert/strict";
import test from "node:test";
import { applyCouponDiscount } from "../../../src/backend/services/pricing.service";

test("applyCouponDiscount supports fixed discounts", () => {
  assert.equal(applyCouponDiscount(500, { type: "fixed", value: 100 }), 100);
});

test("applyCouponDiscount supports percentage discounts with caps", () => {
  assert.equal(
    applyCouponDiscount(1000, {
      type: "percentage",
      value: 20,
      maxDiscountAmount: 150,
    }),
    150
  );
});

test("applyCouponDiscount respects minimum order amount", () => {
  assert.equal(
    applyCouponDiscount(499, {
      type: "fixed",
      value: 100,
      minimumOrderAmount: 500,
    }),
    0
  );
});
