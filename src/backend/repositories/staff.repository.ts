import { createClient } from "@/config/supabase/server";
import { mapStaffRow, mapStaffRows, type StaffRow } from "@/backend/mappers/staff.mapper";
import type { CreateStaffDTO, UpdateStaffDTO } from "@/backend/validations/staff.schema";
import type { Staff } from "@/types/domain";

export class StaffRepository {
  static async listByRestaurant(restaurantId: string): Promise<Staff[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("deleted_at", null)
      .order("role_id");

    if (error) throw error;
    return mapStaffRows((data ?? []) as StaffRow[]);
  }

  static async findById(restaurantId: string, staffId: string): Promise<Staff | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("id", staffId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapStaffRow(data as StaffRow) : null;
  }

  static async create(restaurantId: string, dto: CreateStaffDTO): Promise<Staff> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .insert({
        restaurant_id: restaurantId,
        name: dto.name.trim(),
        role_id: dto.role_id,
        phone: dto.phone?.trim() || null,
        shift_start: dto.shift_start || null,
        shift_end: dto.shift_end || null,
        status: "ACTIVE",
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapStaffRow(data as StaffRow);
  }

  static async update(
    restaurantId: string,
    staffId: string,
    dto: UpdateStaffDTO
  ): Promise<Staff> {
    const payload: Record<string, unknown> = {};

    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.role_id !== undefined) payload.role_id = dto.role_id;
    if (dto.phone !== undefined) payload.phone = dto.phone?.trim() || null;
    if (dto.shift_start !== undefined) payload.shift_start = dto.shift_start || null;
    if (dto.shift_end !== undefined) payload.shift_end = dto.shift_end || null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .update(payload)
      .eq("restaurant_id", restaurantId)
      .eq("id", staffId)
      .select("*")
      .single();

    if (error) throw error;
    return mapStaffRow(data as StaffRow);
  }

  /**
   * Phase 8 — Soft delete: sets is_active = false.
   * Preserves staff history, audit trail, and foreign-key references.
   * The staff member can be reactivated by an owner if needed.
   */
  static async deactivate(restaurantId: string, staffId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("staff")
      .update({ status: "SUSPENDED" })
      .eq("restaurant_id", restaurantId)
      .eq("id", staffId);

    if (error) throw error;
  }

  /**
   * @deprecated Use deactivate() instead. Kept for internal tooling only.
   * Hard-deletes a staff record — only callable server-side with explicit intent.
   */
  static async delete(restaurantId: string, staffId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("staff")
      .update({ deleted_at: new Date().toISOString(), status: "LEFT" })
      .eq("restaurant_id", restaurantId)
      .eq("id", staffId);

    if (error) throw error;
  }
}

