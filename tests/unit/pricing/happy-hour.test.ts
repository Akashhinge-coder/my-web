import assert from "node:assert/strict";
import test from "node:test";
import {
  applyHappyHourDiscount,
  getApplicableHappyHour,
} from "../../../src/backend/services/pricing.service";
import type { HappyHourDiscount, PricingItem } from "../../../src/types/pricing";

const item: PricingItem = {
  id: "drink-1",
  categoryId: "drinks",
  unitPrice: 200,
  quantity: 2,
};

const drinksRule: HappyHourDiscount = {
  id: "drinks-rule",
  discountType: "percentage",
  discountValue: 10,
  startsAt: "2026-05-30T12:00:00.000Z",
  endsAt: "2026-05-30T13:00:00.000Z",
  percentage: 10,
  categoryIds: ["drinks"],
  isActive: true,
};

test("applyHappyHourDiscount returns zero before the promotion window", () => {
  assert.equal(
    applyHappyHourDiscount([item], [drinksRule], "2026-05-30T11:59:00.000Z"),
    0
  );
});

test("applyHappyHourDiscount discounts category items inside the window", () => {
  assert.equal(
    applyHappyHourDiscount([item], [drinksRule], "2026-05-30T12:30:00.000Z"),
    40
  );
});

test("applyHappyHourDiscount returns zero after the promotion window", () => {
  assert.equal(
    applyHappyHourDiscount([item], [drinksRule], "2026-05-30T13:01:00.000Z"),
    0
  );
});

test("applyHappyHourDiscount chooses the best overlapping category discount per item", () => {
  assert.equal(
    applyHappyHourDiscount(
      [item],
      [
        drinksRule,
        {
          id: "better-drinks-rule",
          discountType: "percentage",
          discountValue: 20,
          startsAt: "2026-05-30T12:15:00.000Z",
          endsAt: "2026-05-30T12:45:00.000Z",
          percentage: 20,
          categoryIds: ["drinks"],
          isActive: true,
        },
      ],
      "2026-05-30T12:30:00.000Z"
    ),
    80
  );
});

test("getApplicableHappyHour supports item-specific discounts", () => {
  const applicable = getApplicableHappyHour(
    item,
    [
      {
        id: "selected-dish-rule",
        discountType: "percentage",
        discountValue: 15,
        startsAt: "2026-05-30T12:00:00.000Z",
        endsAt: "2026-05-30T13:00:00.000Z",
        percentage: 15,
        itemIds: ["drink-1"],
        isActive: true,
      },
    ],
    "2026-05-30T12:30:00.000Z"
  );

  assert.deepEqual(applicable, {
    id: "selected-dish-rule",
    discountType: "percentage",
    discountValue: 15,
    affectedItems: [item],
  });
});

test("applyHappyHourDiscount ignores inactive promotions", () => {
  assert.equal(
    applyHappyHourDiscount(
      [item],
      [{ ...drinksRule, isActive: false }],
      "2026-05-30T12:30:00.000Z"
    ),
    0
  );
});
