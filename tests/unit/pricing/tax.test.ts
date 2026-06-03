import assert from "node:assert/strict";
import test from "node:test";
import { calculateTax } from "../../../src/backend/services/pricing.service";

test("calculateTax returns CGST, SGST, GST, and taxable amount", () => {
  assert.deepEqual(calculateTax(1000, { cgstRate: 2.5, sgstRate: 2.5 }), {
    taxableAmount: 1000,
    cgst: 25,
    sgst: 25,
    gst: 50,
  });
});

test("calculateTax rounds money values to two decimals", () => {
  assert.deepEqual(calculateTax(333.33, { cgstRate: 2.5, sgstRate: 2.5 }), {
    taxableAmount: 333.33,
    cgst: 8.33,
    sgst: 8.33,
    gst: 16.66,
  });
});
