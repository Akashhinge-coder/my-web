import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import {
  mapCoupon,
  mapCouponToPricingDiscount,
  type CouponDTO,
} from "@/backend/mappers/coupon.mapper";
import { CouponRepository } from "@/backend/repositories/coupon.repository";
import { applyCouponDiscount } from "@/backend/services/pricing.service";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type {
  CouponCreateDTO,
  CouponUpdateDTO,
  CouponValidateDTO,
} from "@/backend/validations/coupon.validation";

export interface CouponValidationResult {
  valid: boolean;
  coupon: CouponDTO | null;
  discount: number;
  reason?: string;
}

export class CouponService {
  static isActive(expiresAt?: string | null, timestamp: Date | string = new Date()): boolean {
    return !expiresAt || new Date(expiresAt).getTime() > new Date(timestamp).getTime();
  }

  static async list(): Promise<CouponDTO[]> {
    const access = await resolveRestaurantAccess();
    const rows = await CouponRepository.listByRestaurant(access.restaurantId);
    return rows.map(mapCoupon);
  }

  static async create(dto: CouponCreateDTO): Promise<CouponDTO> {
    const access = await resolveRestaurantAccess();
    const row = await CouponRepository.create(access.restaurantId, dto);
    return mapCoupon(row);
  }

  static async update(couponId: string, dto: CouponUpdateDTO): Promise<CouponDTO> {
    const access = await resolveRestaurantAccess();
    const existing = await CouponRepository.findById(access.restaurantId, couponId);
    if (!existing) throw new NotFoundError("Coupon not found");

    const row = await CouponRepository.update(access.restaurantId, couponId, dto);
    return mapCoupon(row);
  }

  static async delete(couponId: string): Promise<void> {
    const access = await resolveRestaurantAccess();
    const existing = await CouponRepository.findById(access.restaurantId, couponId);
    if (!existing) throw new NotFoundError("Coupon not found");
    await CouponRepository.delete(access.restaurantId, couponId);
  }

  static async validate(dto: CouponValidateDTO): Promise<CouponValidationResult> {
    const access = await resolveRestaurantAccess();
    return this.validateForRestaurant(access.restaurantId, dto);
  }

  static async validateForRestaurant(
    restaurantId: string,
    dto: CouponValidateDTO
  ): Promise<CouponValidationResult> {
    const row = await CouponRepository.findByCode(restaurantId, dto.code);
    if (!row) {
      return { valid: false, coupon: null, discount: 0, reason: "Coupon not found" };
    }

    const coupon = mapCoupon(row);
    const reason = this.getInvalidReason(coupon, dto.timestamp);
    if (reason) {
      return { valid: false, coupon, discount: 0, reason };
    }

    const discount = applyCouponDiscount(dto.orderAmount, mapCouponToPricingDiscount(coupon));
    if (discount <= 0 && coupon.minOrder > dto.orderAmount) {
      return { valid: false, coupon, discount: 0, reason: "Minimum order amount not met" };
    }

    return { valid: true, coupon, discount };
  }

  static getInvalidReason(coupon: CouponDTO, timestamp: Date | string = new Date()): string | null {
    if (!coupon.isActive) return "Coupon is inactive";
    if (!this.isActive(coupon.expiresAt, timestamp)) return "Coupon has expired";
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return "Coupon usage limit reached";
    }
    return null;
  }

  static assertUsable(coupon: CouponDTO, timestamp: Date | string = new Date()): void {
    const reason = this.getInvalidReason(coupon, timestamp);
    if (reason) throw new ValidationError(reason);
  }
}
