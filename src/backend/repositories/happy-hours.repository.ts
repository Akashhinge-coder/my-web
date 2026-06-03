import { createAdminClient } from "@/config/supabase/server";
import type { HappyHourRow } from "@/backend/mappers/happy-hours.mapper";
import type {
  HappyHourCreateDTO,
  HappyHourUpdateDTO,
} from "@/backend/validations/happy-hours.validation";

const HAPPY_HOUR_SELECT = "id, restaurant_id, name, discount_type, discount_value, days, start_time, end_time, is_active, category_ids, item_ids";

function toInsertPayload(restaurantId: string, dto: HappyHourCreateDTO) {
  return {
    restaurant_id: restaurantId,
    name: dto.name,
    discount_type: dto.discountType,
    discount_value: dto.discountValue,
    days: dto.days,
    start_time: dto.startTime,
    end_time: dto.endTime,
    is_active: dto.isActive,
    category_ids: dto.categoryIds,
    item_ids: dto.itemIds,
  };
}

function toUpdatePayload(dto: HappyHourUpdateDTO) {
  return {
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.discountType !== undefined ? { discount_type: dto.discountType } : {}),
    ...(dto.discountValue !== undefined ? { discount_value: dto.discountValue } : {}),
    ...(dto.days !== undefined ? { days: dto.days } : {}),
    ...(dto.startTime !== undefined ? { start_time: dto.startTime } : {}),
    ...(dto.endTime !== undefined ? { end_time: dto.endTime } : {}),
    ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
    ...(dto.categoryIds !== undefined ? { category_ids: dto.categoryIds } : {}),
    ...(dto.itemIds !== undefined ? { item_ids: dto.itemIds } : {}),
  };
}

export class HappyHoursRepository {
  static async listByRestaurant(restaurantId: string): Promise<HappyHourRow[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("happy_hours")
      .select(HAPPY_HOUR_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return (data ?? []) as HappyHourRow[];
  }

  static async findById(restaurantId: string, happyHourId: string): Promise<HappyHourRow | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("happy_hours")
      .select(HAPPY_HOUR_SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("id", happyHourId)
      .maybeSingle();

    if (error) throw error;
    return data as HappyHourRow | null;
  }

  static async create(restaurantId: string, dto: HappyHourCreateDTO): Promise<HappyHourRow> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("happy_hours")
      .insert(toInsertPayload(restaurantId, dto))
      .select(HAPPY_HOUR_SELECT)
      .single();

    if (error) throw error;
    return data as HappyHourRow;
  }

  static async update(
    restaurantId: string,
    happyHourId: string,
    dto: HappyHourUpdateDTO
  ): Promise<HappyHourRow> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("happy_hours")
      .update(toUpdatePayload(dto))
      .eq("restaurant_id", restaurantId)
      .eq("id", happyHourId)
      .select(HAPPY_HOUR_SELECT)
      .single();

    if (error) throw error;
    return data as HappyHourRow;
  }

  static async delete(restaurantId: string, happyHourId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("happy_hours")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", happyHourId);

    if (error) throw error;
  }
}
