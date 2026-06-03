import { createClient } from "@/config/supabase/server";
import type { CouponRow } from "@/backend/mappers/coupon.mapper";
import type { CouponCreateDTO, CouponUpdateDTO } from "@/backend/validations/coupon.validation";

const COUPON_SELECT = "id, restaurant_id, code, type, value, min_order, max_discount, max_uses, used_count, expires_at, is_active";

function toInsertPayload(restaurantId: string, dto: CouponCreateDTO) {
  return {
    restaurant_id: restaurantId,
    code: dto.code,
    type: dto.type,
    value: dto.value,
    min_order: dto.minOrder,
    max_discount: dto.maxDiscount ?? null,
    max_uses: dto.maxUses ?? null,
    expires_at: dto.expiresAt ?? null,
    is_active: true,
  };
}

function toUpdatePayload(dto: CouponUpdateDTO) {
  return {
    ...(dto.code !== undefined ? { code: dto.code } : {}),
    ...(dto.type !== undefined ? { type: dto.type } : {}),
    ...(dto.value !== undefined ? { value: dto.value } : {}),
    ...(dto.minOrder !== undefined ? { min_order: dto.minOrder } : {}),
    ...(dto.maxDiscount !== undefined ? { max_discount: dto.maxDiscount ?? null } : {}),
    ...(dto.maxUses !== undefined ? { max_uses: dto.maxUses ?? null } : {}),
    ...(dto.expiresAt !== undefined ? { expires_at: dto.expiresAt ?? null } : {}),
    ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
  };
}

export class CouponRepository {
  static async listByRestaurant(restaurantId: string): Promise<CouponRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("coupons")
      .select(COUPON_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("code", { ascending: true });

    if (error) throw error;
    return (data ?? []) as CouponRow[];
  }

  static async findById(restaurantId: string, couponId: string): Promise<CouponRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("coupons")
      .select(COUPON_SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("id", couponId)
      .maybeSingle();

    if (error) throw error;
    return data as CouponRow | null;
  }

  static async findByCode(restaurantId: string, code: string): Promise<CouponRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("coupons")
      .select(COUPON_SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("code", code)
      .maybeSingle();

    if (error) throw error;
    return data as CouponRow | null;
  }

  static async create(restaurantId: string, dto: CouponCreateDTO): Promise<CouponRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("coupons")
      .insert(toInsertPayload(restaurantId, dto))
      .select(COUPON_SELECT)
      .single();

    if (error) throw error;
    return data as CouponRow;
  }

  static async update(restaurantId: string, couponId: string, dto: CouponUpdateDTO): Promise<CouponRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("coupons")
      .update(toUpdatePayload(dto))
      .eq("restaurant_id", restaurantId)
      .eq("id", couponId)
      .select(COUPON_SELECT)
      .single();

    if (error) throw error;
    return data as CouponRow;
  }

  static async delete(restaurantId: string, couponId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", couponId);

    if (error) throw error;
  }
}
