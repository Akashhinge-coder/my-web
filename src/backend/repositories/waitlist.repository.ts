import { createAdminClient } from "@/config/supabase/server";
import { mapWaitlistRow, mapWaitlistRows, type WaitlistRow } from "@/backend/mappers/waitlist.mapper";
import type { CreateWaitlistDTO, UpdateWaitlistStatusDTO } from "@/backend/validations/waitlist.validation";
import type { Waitlist } from "@/types/domain";

const ACTIVE_STATUSES = ["waiting", "notified"] as const;

export class WaitlistRepository {
  static async listActive(restaurantId: string): Promise<Waitlist[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .in("status", [...ACTIVE_STATUSES])
      .order("joined_at");

    if (error) throw error;
    return mapWaitlistRows((data ?? []) as WaitlistRow[]);
  }

  static async findById(restaurantId: string, entryId: string): Promise<Waitlist | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("id", entryId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapWaitlistRow(data as WaitlistRow) : null;
  }

  static async create(restaurantId: string, dto: CreateWaitlistDTO): Promise<Waitlist> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        restaurant_id: restaurantId,
        guest_name: dto.guest_name.trim(),
        guest_phone: dto.guest_phone,
        party_size: dto.party_size,
        status: "waiting",
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapWaitlistRow(data as WaitlistRow);
  }

  static async updateStatus(
    restaurantId: string,
    entryId: string,
    dto: UpdateWaitlistStatusDTO
  ): Promise<Waitlist> {
    const payload: Record<string, unknown> = { status: dto.status };
    if (dto.status === "notified") {
      payload.notified_at = new Date().toISOString();
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waitlist")
      .update(payload)
      .eq("restaurant_id", restaurantId)
      .eq("id", entryId)
      .select("*")
      .single();

    if (error) throw error;
    return mapWaitlistRow(data as WaitlistRow);
  }
}
