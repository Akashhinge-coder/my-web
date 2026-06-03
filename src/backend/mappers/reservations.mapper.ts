import type { ReservationWithTable } from "@/types/reservations";
import type { ReservationStatus } from "@/types/domain";

export interface ReservationRow {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  reserved_at: string;
  notes: string | null;
  status: string;
  restaurant_tables?: { table_number: string } | { table_number: string }[] | null;
}

function toStatus(value: string): ReservationStatus {
  if (
    value === "confirmed" ||
    value === "seated" ||
    value === "cancelled" ||
    value === "no_show"
  ) {
    return value;
  }
  return "confirmed";
}

export function mapReservationRow(row: ReservationRow): ReservationWithTable {
  const tableJoin = Array.isArray(row.restaurant_tables)
    ? row.restaurant_tables[0] ?? null
    : row.restaurant_tables ?? null;

  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    table_id: row.table_id,
    guest_name: row.guest_name,
    guest_phone: row.guest_phone,
    party_size: row.party_size,
    reserved_at: row.reserved_at,
    notes: row.notes,
    status: toStatus(row.status),
    restaurant_tables: tableJoin,
  };
}

export function mapReservationRows(rows: ReservationRow[]): ReservationWithTable[] {
  return rows.map(mapReservationRow);
}
