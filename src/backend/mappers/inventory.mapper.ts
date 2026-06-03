import type { InventoryItem } from "@/types/domain";

export interface InventoryRow {
  id: string;
  restaurant_id: string;
  ingredient_name: string;
  unit: string;
  current_qty: number | string;
  low_stock_alert: number | string;
  supplier_id: string | null;
  updated_at: string;
}

function toNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapInventoryRow(row: InventoryRow): InventoryItem {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    ingredient_name: row.ingredient_name,
    unit: row.unit,
    current_qty: toNumber(row.current_qty),
    low_stock_alert: toNumber(row.low_stock_alert),
    supplier_id: row.supplier_id,
    updated_at: row.updated_at,
  };
}

export function mapInventoryRows(rows: InventoryRow[]): InventoryItem[] {
  return rows.map(mapInventoryRow);
}
