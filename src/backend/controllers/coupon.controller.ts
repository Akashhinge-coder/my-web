import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { CouponService } from "@/backend/services/coupon.service";
import {
  couponCreateSchema,
  couponUpdateSchema,
  couponValidateSchema,
} from "@/backend/validations/coupon.validation";
import { created, ok } from "@/backend/utils/apiResponse";

export async function listCoupons() {
  try {
    return ok(await CouponService.list());
  } catch (error) {
    return handleError(error);
  }
}

export async function createCoupon(req: NextRequest) {
  try {
    const dto = validate(couponCreateSchema, await req.json());
    return created(await CouponService.create(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateCoupon(req: NextRequest, couponId: string) {
  try {
    const dto = validate(couponUpdateSchema, await req.json());
    return ok(await CouponService.update(couponId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteCoupon(couponId: string) {
  try {
    await CouponService.delete(couponId);
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function validateCoupon(req: NextRequest) {
  try {
    const dto = validate(couponValidateSchema, await req.json());
    return ok(await CouponService.validate(dto));
  } catch (error) {
    return handleError(error);
  }
}
