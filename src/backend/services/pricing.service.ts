import type {
  ApplicableHappyHour,
  CouponDiscount,
  HappyHourDiscount,
  LoyaltyDiscount,
  PricingContext,
  PricingItem,
  PricingResult,
  RestaurantPricingSettings,
  TaxBreakdown,
} from "@/types/pricing";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clampMoney(value: number, max: number): number {
  return roundMoney(Math.max(0, Math.min(value, max)));
}

function itemTotal(item: PricingItem): number {
  return roundMoney(item.unitPrice * item.quantity);
}

function isWithinWindow(timestamp: Date, startsAt: string, endsAt: string): boolean {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return timestamp >= start && timestamp <= end;
}

function activeDay(timestamp: Date): string {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][timestamp.getDay()];
}

function isHappyHourEligible(item: PricingItem, rule: HappyHourDiscount): boolean {
  if (rule.isActive === false) return false;
  if (item.happyHourEligible === false) return false;

  const hasItemScope = Boolean(rule.itemIds?.length);
  const hasCategoryScope = Boolean(rule.categoryIds?.length);

  if (!hasItemScope && !hasCategoryScope) return true;

  const matchesItem = Boolean(rule.itemIds?.includes(item.id));
  const matchesCategory = Boolean(item.categoryId && rule.categoryIds?.includes(item.categoryId));

  return matchesItem || matchesCategory;
}

function happyHourDiscountForItem(item: PricingItem, rule: HappyHourDiscount): number {
  const discountType = rule.discountType ?? "percentage";
  const discountValue = rule.discountValue ?? rule.percentage;
  const total = itemTotal(item);
  const discount = discountType === "fixed"
    ? discountValue * item.quantity
    : (total * discountValue) / 100;

  return clampMoney(discount, total);
}

export class PricingService {
  static calculatePricingItemTotal(item: PricingItem): number {
    return itemTotal(item);
  }

  static calculateOrderPricing(context: PricingContext): PricingResult {
    const timestamp = context.timestamp ? new Date(context.timestamp) : new Date();
    const subtotal = roundMoney(
      context.items.reduce((sum, item) => sum + itemTotal(item), 0)
    );

    const happyHourDiscount = this.applyHappyHourDiscount(
      context.items,
      context.happyHours ?? [],
      timestamp
    );
    const afterHappyHour = clampMoney(subtotal - happyHourDiscount, subtotal);

    const couponDiscount = this.applyCouponDiscount(afterHappyHour, context.coupon);
    const afterCoupon = clampMoney(afterHappyHour - couponDiscount, afterHappyHour);

    const loyaltyDiscount = this.applyLoyaltyRedemption(afterCoupon, context.loyaltyPoints);
    const taxableAmount = clampMoney(afterCoupon - loyaltyDiscount, afterCoupon);

    const tax = this.calculateTax(taxableAmount, context.restaurantSettings);
    const totalDiscount = roundMoney(happyHourDiscount + couponDiscount + loyaltyDiscount);

    // Calculate earned points on the post-discount taxable amount
    let loyaltyPointsEarned = 0;
    if (context.loyaltyPoints?.earnEnabled && context.loyaltyPoints.pointsPerHundred) {
      loyaltyPointsEarned = Math.floor(taxableAmount / 100) * context.loyaltyPoints.pointsPerHundred;
    }

    return {
      subtotal,
      happyHourDiscount,
      couponDiscount,
      loyaltyDiscount,
      taxableAmount: tax.taxableAmount,
      cgst: tax.cgst,
      sgst: tax.sgst,
      gst: tax.gst,
      totalDiscount,
      grandTotal: roundMoney(taxableAmount + tax.gst),
      loyaltyPointsEarned,
    };
  }

  static calculateTax(
    taxableAmount: number,
    restaurantSettings: RestaurantPricingSettings
  ): TaxBreakdown {
    const normalizedTaxableAmount = roundMoney(Math.max(0, taxableAmount));
    const cgst = roundMoney((normalizedTaxableAmount * restaurantSettings.cgstRate) / 100);
    const sgst = roundMoney((normalizedTaxableAmount * restaurantSettings.sgstRate) / 100);

    return {
      taxableAmount: normalizedTaxableAmount,
      cgst,
      sgst,
      gst: roundMoney(cgst + sgst),
    };
  }

  static combineOrderPricing(pricing: PricingResult[]): PricingResult {
    return {
      subtotal: roundMoney(pricing.reduce((sum, item) => sum + item.subtotal, 0)),
      happyHourDiscount: roundMoney(pricing.reduce((sum, item) => sum + item.happyHourDiscount, 0)),
      couponDiscount: roundMoney(pricing.reduce((sum, item) => sum + item.couponDiscount, 0)),
      loyaltyDiscount: roundMoney(pricing.reduce((sum, item) => sum + item.loyaltyDiscount, 0)),
      taxableAmount: roundMoney(pricing.reduce((sum, item) => sum + item.taxableAmount, 0)),
      cgst: roundMoney(pricing.reduce((sum, item) => sum + item.cgst, 0)),
      sgst: roundMoney(pricing.reduce((sum, item) => sum + item.sgst, 0)),
      gst: roundMoney(pricing.reduce((sum, item) => sum + item.gst, 0)),
      totalDiscount: roundMoney(pricing.reduce((sum, item) => sum + item.totalDiscount, 0)),
      grandTotal: roundMoney(pricing.reduce((sum, item) => sum + item.grandTotal, 0)),
      loyaltyPointsEarned: pricing.reduce((sum, item) => sum + (item.loyaltyPointsEarned || 0), 0),
    };
  }

  static applyCouponDiscount(amount: number, coupon?: CouponDiscount | null): number {
    const baseAmount = roundMoney(Math.max(0, amount));
    if (!coupon) return 0;
    if (coupon.minimumOrderAmount && baseAmount < coupon.minimumOrderAmount) return 0;

    const rawDiscount = coupon.type === "percentage"
      ? (baseAmount * coupon.value) / 100
      : coupon.value;
    const cappedDiscount = coupon.maxDiscountAmount
      ? Math.min(rawDiscount, coupon.maxDiscountAmount)
      : rawDiscount;

    return clampMoney(cappedDiscount, baseAmount);
  }

  static applyLoyaltyRedemption(amount: number, loyalty?: LoyaltyDiscount | null): number {
    const baseAmount = roundMoney(Math.max(0, amount));
    if (!loyalty) return 0;
    if (loyalty.minimumPointsToRedeem && loyalty.pointsToRedeem < loyalty.minimumPointsToRedeem) {
      return 0;
    }

    const redeemablePoints = Math.max(
      0,
      Math.min(loyalty.pointsToRedeem, loyalty.pointsBalance)
    );
    if (loyalty.minimumPointsToRedeem && redeemablePoints < loyalty.minimumPointsToRedeem) {
      return 0;
    }

    const requestedDiscount = redeemablePoints * loyalty.redemptionRate;
    const maxDiscount = (baseAmount * loyalty.maxRedemptionPercent) / 100;

    return clampMoney(Math.min(requestedDiscount, maxDiscount), baseAmount);
  }

  static applyHappyHourDiscount(
    items: PricingItem[],
    happyHours: HappyHourDiscount[],
    timestamp: Date | string = new Date()
  ): number {
    const activeAt = timestamp instanceof Date ? timestamp : new Date(timestamp);

    const discount = items.reduce((sum, item) => {
      const applicable = this.getApplicableHappyHour(item, happyHours, activeAt);
      if (!applicable) return sum;

      return sum + (
        applicable.discountType === "fixed"
          ? clampMoney(applicable.discountValue * item.quantity, itemTotal(item))
          : (itemTotal(item) * applicable.discountValue) / 100
      );
    }, 0);

    const subtotal = items.reduce((sum, item) => sum + itemTotal(item), 0);
    return clampMoney(discount, subtotal);
  }

  static getApplicableHappyHour(
    item: PricingItem,
    happyHours: HappyHourDiscount[],
    timestamp: Date | string = new Date()
  ): ApplicableHappyHour | null {
    const activeAt = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const applicableRules = happyHours
      .filter((rule) => isWithinWindow(activeAt, rule.startsAt, rule.endsAt))
      .filter((rule) => !rule.days?.length || rule.days.includes(activeDay(activeAt)))
      .filter((rule) => isHappyHourEligible(item, rule));

    const best = applicableRules.reduce<HappyHourDiscount | null>((currentBest, rule) => {
      if (!currentBest) return rule;
      return happyHourDiscountForItem(item, rule) > happyHourDiscountForItem(item, currentBest)
        ? rule
        : currentBest;
    }, null);

    if (!best) return null;

    return {
      id: best.id,
      discountType: best.discountType ?? "percentage",
      discountValue: best.discountValue ?? best.percentage,
      affectedItems: [item],
    };
  }
}

export const calculateOrderPricing = PricingService.calculateOrderPricing.bind(PricingService);
export const calculatePricingItemTotal = PricingService.calculatePricingItemTotal.bind(PricingService);
export const combineOrderPricing = PricingService.combineOrderPricing.bind(PricingService);
export const calculateTax = PricingService.calculateTax.bind(PricingService);
export const applyCouponDiscount = PricingService.applyCouponDiscount.bind(PricingService);
export const applyLoyaltyRedemption = PricingService.applyLoyaltyRedemption.bind(PricingService);
export const applyHappyHourDiscount = PricingService.applyHappyHourDiscount.bind(PricingService);
export const getApplicableHappyHour = PricingService.getApplicableHappyHour.bind(PricingService);
