export interface PricingItem {
  id: string;
  name?: string;
  categoryId?: string;
  unitPrice: number;
  quantity: number;
  happyHourEligible?: boolean;
}

export interface CouponDiscount {
  code?: string;
  type: "fixed" | "percentage";
  value: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
}

export interface LoyaltyDiscount {
  pointsBalance: number;
  pointsToRedeem: number;
  redemptionRate: number;
  maxRedemptionPercent: number;
  minimumPointsToRedeem?: number;
  pointsPerHundred?: number;
  earnEnabled?: boolean;
}

export interface HappyHourDiscount {
  id?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  startsAt: string;
  endsAt: string;
  percentage: number;
  itemIds?: string[];
  categoryIds?: string[];
  isActive?: boolean;
  days?: string[];
}

export interface ApplicableHappyHour {
  id?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  affectedItems: PricingItem[];
}

export interface RestaurantPricingSettings {
  cgstRate: number;
  sgstRate: number;
}

export interface PricingContext {
  items: PricingItem[];
  coupon?: CouponDiscount | null;
  loyaltyPoints?: LoyaltyDiscount | null;
  happyHours?: HappyHourDiscount[];
  restaurantSettings: RestaurantPricingSettings;
  timestamp?: Date | string;
}

export interface TaxBreakdown {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  gst: number;
}

export interface PricingResult extends TaxBreakdown {
  subtotal: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  happyHourDiscount: number;
  totalDiscount: number;
  grandTotal: number;
  loyaltyPointsEarned?: number;
}

export type OrderPricingDto = PricingResult;
