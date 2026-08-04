const { PricingService } = require('./src/backend/services/pricing.service');
const { HappyHoursService } = require('./src/backend/services/happy-hours.service');
const { mapHappyHourToPricingDiscount } = require('./src/backend/mappers/happy-hours.mapper');

const rule = {
  id: "test",
  name: "test",
  discountType: "percent",
  discountValue: 10,
  days: ["wed"], // today is Wednesday? Let's check
  startTime: "18:00",
  endTime: "20:00",
  isActive: true,
  categoryIds: [],
  itemIds: []
};

const timestamp = new Date("2026-07-08T13:30:00.000Z"); // 7:00 PM IST on Wed July 8
console.log("isActive", HappyHoursService.isActive(rule, timestamp));

const pricingRules = [mapHappyHourToPricingDiscount(rule, timestamp)];
console.log("pricingRules", pricingRules);

const items = [{
  id: "item1",
  unitPrice: 100,
  quantity: 2,
}];

const res = PricingService.applyHappyHourDiscount(items, pricingRules, timestamp);
console.log("result discount", res);
