import type { Staff, UserRole } from "@/types/domain";

export interface StaffRow {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  name: string;
  role: string;
  phone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  is_active: boolean;
  created_at: string;
}

function toRole(value: string): UserRole {
  if (
    value === "admin" ||
    value === "manager" ||
    value === "waiter" ||
    value === "kitchen" ||
    value === "superadmin"
  ) {
    return value;
  }
  return "waiter";
}

export function mapStaffRow(row: StaffRow): Staff {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    user_id: row.user_id,
    name: row.name,
    role: toRole(row.role),
    phone: row.phone,
    shift_start: row.shift_start,
    shift_end: row.shift_end,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export function mapStaffRows(rows: StaffRow[]): Staff[] {
  return rows.map(mapStaffRow);
}
