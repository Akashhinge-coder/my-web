import { createClient } from "@/config/supabase/server";
import { mapInventoryRow, mapInventoryRows, type InventoryRow } from "@/backend/mappers/inventory.mapper";
import type { InventoryItem } from "@/types/domain";
import type { CreateInventoryDTO, UpdateInventoryDTO } from "@/backend/validations/inventory.validation";

export class InventoryRepository {
  static async listByRestaurant(restaurantId: string): Promise<InventoryItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("ingredient_name");

    if (error) throw error;
    return mapInventoryRows((data ?? []) as InventoryRow[]);
  }

  static async findById(restaurantId: string, itemId: string): Promise<InventoryItem | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("id", itemId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapInventoryRow(data as InventoryRow) : null;
  }

  static async create(restaurantId: string, dto: CreateInventoryDTO): Promise<InventoryItem> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("inventory")
      .insert({
        restaurant_id: restaurantId,
        ingredient_name: dto.ingredient_name.trim(),
        unit: dto.unit,
        current_qty: dto.current_qty,
        low_stock_alert: dto.low_stock_alert,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapInventoryRow(data as InventoryRow);
  }

  static async update(
    restaurantId: string,
    itemId: string,
    dto: UpdateInventoryDTO,
    existing: InventoryItem
  ): Promise<InventoryItem> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = { updated_at: now };

    if (dto.ingredient_name !== undefined) {
      payload.ingredient_name = dto.ingredient_name.trim();
    }
    if (dto.unit !== undefined) {
      payload.unit = dto.unit;
    }
    if (dto.low_stock_alert !== undefined) {
      payload.low_stock_alert = dto.low_stock_alert;
    }

    if (dto.delta !== undefined) {
      payload.current_qty = Math.max(0, existing.current_qty + dto.delta);
    } else if (dto.current_qty !== undefined) {
      payload.current_qty = dto.current_qty;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory")
      .update(payload)
      .eq("restaurant_id", restaurantId)
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) throw error;
    return mapInventoryRow(data as InventoryRow);
  }

  static async delete(restaurantId: string, itemId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("inventory")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", itemId);

    if (error) throw error;
  }
}
