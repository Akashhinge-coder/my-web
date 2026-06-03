import assert from "node:assert/strict";
import test from "node:test";
import { applyLoyaltyRedemption } from "../../../src/backend/services/pricing.service";

test("applyLoyaltyRedemption uses available balance and redemption rate", () => {
  assert.equal(
    applyLoyaltyRedemption(1000, {
      pointsBalance: 300,
      pointsToRedeem: 200,
      redemptionRate: 0.5,
      maxRedemptionPercent: 25,
    }),
    100
  );
});

test("applyLoyaltyRedemption caps by max redemption percentage", () => {
  assert.equal(
    applyLoyaltyRedemption(1000, {
      pointsBalance: 1000,
      pointsToRedeem: 1000,
      redemptionRate: 1,
      maxRedemptionPercent: 20,
    }),
    200
  );
});

test("applyLoyaltyRedemption cannot redeem more than points balance", () => {
  assert.equal(
    applyLoyaltyRedemption(1000, {
      pointsBalance: 50,
      pointsToRedeem: 500,
      redemptionRate: 1,
      maxRedemptionPercent: 100,
    }),
    50
  );
});

test("applyLoyaltyRedemption requires the available redeemable balance to meet the minimum", () => {
  assert.equal(
    applyLoyaltyRedemption(1000, {
      pointsBalance: 50,
      pointsToRedeem: 100,
      redemptionRate: 1,
      maxRedemptionPercent: 100,
      minimumPointsToRedeem: 100,
    }),
    0
  );
});
