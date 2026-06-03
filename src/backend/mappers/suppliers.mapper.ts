import type { Supplier } from "@/types/domain";

export interface SupplierRow {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at?: string;
}

export function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
  };
}

export function mapSupplierRows(rows: SupplierRow[]): Supplier[] {
  return rows.map(mapSupplierRow);
}
