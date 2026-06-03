import { apiFetch } from "@/frontend/api/http";

export interface Coupon {
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

export interface CouponPayload {
  code: string;
  type: "flat" | "percent";
  value: number;
  minOrder: number;
  maxDiscount?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface CouponValidationPayload {
  code: string;
  orderAmount: number;
  timestamp?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon: Coupon | null;
  discount: number;
  reason?: string;
}

export const couponsApi = {
  list() {
    return apiFetch<Coupon[]>("/api/v1/coupons");
  },

  create(payload: CouponPayload) {
    return apiFetch<Coupon>("/api/v1/coupons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<CouponPayload> & { isActive?: boolean }) {
    return apiFetch<Coupon>(`/api/v1/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string) {
    return apiFetch<{ deleted: true }>(`/api/v1/coupons/${id}`, {
      method: "DELETE",
    });
  },

  validate(payload: CouponValidationPayload) {
    return apiFetch<CouponValidationResult>("/api/v1/coupons/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
