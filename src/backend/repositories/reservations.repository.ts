import { createClient } from "@/config/supabase/server";
import {
  mapReservationRow,
  mapReservationRows,
  type ReservationRow,
} from "@/backend/mappers/reservations.mapper";
import type { CreateReservationDTO, UpdateReservationStatusDTO } from "@/backend/validations/reservations.validation";
import type { ReservationTableOption, ReservationWithTable } from "@/types/reservations";
import type { TableStatus } from "@/types/domain";

export class ReservationsRepository {
  static async listUpcoming(restaurantId: string, fromISO: string): Promise<ReservationWithTable[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*, restaurant_tables(table_number)")
      .eq("restaurant_id", restaurantId)
      .gte("reserved_at", fromISO)
      .order("reserved_at");

    if (error) throw error;
    return mapReservationRows((data ?? []) as ReservationRow[]);
  }

  static async listTablesForRestaurant(restaurantId: string): Promise<ReservationTableOption[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, seating_capacity, status")
      .eq("restaurant_id", restaurantId)
      .order("table_number");

    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      table_number: row.table_number as string,
      seating_capacity: row.seating_capacity as number,
      status: row.status as TableStatus,
    }));
  }

  static async findById(restaurantId: string, reservationId: string): Promise<ReservationWithTable | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("*, restaurant_tables(table_number)")
      .eq("restaurant_id", restaurantId)
      .eq("id", reservationId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapReservationRow(data as ReservationRow) : null;
  }

  static async create(restaurantId: string, dto: CreateReservationDTO): Promise<ReservationWithTable> {
    const supabase = await createClient();
    const tableId = dto.table_id && dto.table_id !== "" ? dto.table_id : null;
    const { data, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: restaurantId,
        guest_name: dto.guest_name.trim(),
        guest_phone: dto.guest_phone,
        party_size: dto.party_size,
        reserved_at: new Date(dto.reserved_at).toISOString(),
        notes: dto.notes?.trim() || null,
        table_id: tableId,
        status: "confirmed",
      })
      .select("*, restaurant_tables(table_number)")
      .single();

    if (error) throw error;
    return mapReservationRow(data as ReservationRow);
  }

  static async updateStatus(
    restaurantId: string,
    reservationId: string,
    dto: UpdateReservationStatusDTO
  ): Promise<ReservationWithTable> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .update({ status: dto.status })
      .eq("restaurant_id", restaurantId)
      .eq("id", reservationId)
      .select("*, restaurant_tables(table_number)")
      .single();

    if (error) throw error;
    return mapReservationRow(data as ReservationRow);
  }
}
