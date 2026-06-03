import type { CouponDiscount } from "@/types/pricing";

export interface CouponRow {
  id: string;
  restaurant_id: string;
  code: string;
  type: "flat" | "percent";
  value: number | string;
  min_order: number | string;
  max_discount: number | string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface CouponDTO {
  id: string;
  code: string;
  type: "flat" | "percent";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export function mapCoupon(row: CouponRow): CouponDTO {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    minOrder: Number(row.min_order),
    maxDiscount: row.max_discount === null ? null : Number(row.max_discount),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    isActive: row.is_active,
  };
}

export function mapCouponToPricingDiscount(coupon: CouponDTO): CouponDiscount {
  return {
    code: coupon.code,
    type: coupon.type === "percent" ? "percentage" : "fixed",
    value: coupon.value,
    minimumOrderAmount: coupon.minOrder,
    maxDiscountAmount: coupon.maxDiscount ?? undefined,
  };
}
