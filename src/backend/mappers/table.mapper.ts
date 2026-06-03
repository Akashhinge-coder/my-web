import type { Table, TableStatus, TableType } from "@/types/domain";

export interface TableRow {
  id: string;
  restaurant_id: string;
  table_number: string;
  seating_capacity: number;
  table_type: string;
  status: string;
  assigned_waiter_id: string | null;
  current_session_id: string | null;
  qr_url: string | null;
  floor: string | null;
  created_at: string;
}

function toTableType(value: string): TableType {
  if (value === "booth" || value === "outdoor" || value === "private") return value;
  return "regular";
}

function toTableStatus(value: string): TableStatus {
  if (value === "occupied" || value === "reserved" || value === "cleaning") return value;
  return "available";
}

export function mapTableRow(row: TableRow): Table {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    table_number: row.table_number,
    seating_capacity: row.seating_capacity,
    table_type: toTableType(row.table_type),
    status: toTableStatus(row.status),
    assigned_waiter_id: row.assigned_waiter_id,
    current_session_id: row.current_session_id,
    qr_url: row.qr_url,
    floor: row.floor,
    created_at: row.created_at,
  };
}

export function mapTableRows(rows: TableRow[]): Table[] {
  return rows.map(mapTableRow);
}
