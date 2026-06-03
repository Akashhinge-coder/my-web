import { createAdminClient } from "@/config/supabase/server";
import { mapTableRow, mapTableRows, type TableRow } from "@/backend/mappers/table.mapper";
import type { CreateTableDTO, UpdateTableStatusDTO } from "@/backend/validations/table.validation";
import type { Table } from "@/types/domain";

export class TableRepository {
  static async listByRestaurant(restaurantId: string): Promise<Table[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("table_number");

    if (error) throw error;
    return mapTableRows((data ?? []) as TableRow[]);
  }

  static async findByIdForRestaurant(restaurantId: string, tableId: string): Promise<Table | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("id", tableId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapTableRow(data as TableRow) : null;
  }

  static async findById(tableId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number, status, current_session_id")
      .eq("id", tableId)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(
    restaurantId: string,
    dto: CreateTableDTO,
    qrUrl: string,
    id: string
  ): Promise<Table> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .insert({
        id,
        restaurant_id: restaurantId,
        table_number: dto.table_number.trim(),
        seating_capacity: dto.seating_capacity,
        table_type: dto.table_type,
        floor: dto.floor?.trim() || null,
        qr_url: qrUrl,
        status: "available",
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapTableRow(data as TableRow);
  }

  static async updateStatus(
    restaurantId: string,
    tableId: string,
    dto: UpdateTableStatusDTO
  ): Promise<Table> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .update({ status: dto.status })
      .eq("restaurant_id", restaurantId)
      .eq("id", tableId)
      .select("*")
      .single();

    if (error) throw error;
    return mapTableRow(data as TableRow);
  }

  static async delete(restaurantId: string, tableId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", tableId);

    if (error) throw error;
  }

  static async markOccupied(tableId: string, sessionId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .update({ status: "occupied", current_session_id: sessionId })
      .eq("id", tableId)
      .select("id, table_number, current_session_id")
      .single();

    if (error) throw error;
    return data;
  }
}
