import type { Staff, StaffStatus } from "@/types/domain";

export interface StaffRow {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  name: string;
  role_id: string;
  username: string | null;
  phone: string | null;
  shift_start: string | null;
  shift_end: string | null;
  must_change_password: boolean;
  password_changed_at: string | null;
  temporary_password_expires_at: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  status: StaffStatus;
  is_emergency_admin: boolean;
  deleted_at: string | null;
  provider: string | null;
  provider_user_id: string | null;
  is_active: boolean; // deprecated
  created_at: string;
}

export function mapStaffRow(row: StaffRow): Staff {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    user_id: row.user_id,
    name: row.name,
    role_id: row.role_id,
    username: row.username,
    phone: row.phone,
    shift_start: row.shift_start,
    shift_end: row.shift_end,
    must_change_password: row.must_change_password,
    password_changed_at: row.password_changed_at,
    temporary_password_expires_at: row.temporary_password_expires_at,
    failed_login_attempts: row.failed_login_attempts,
    locked_until: row.locked_until,
    last_login_at: row.last_login_at,
    status: row.status,
    is_emergency_admin: row.is_emergency_admin,
    deleted_at: row.deleted_at,
    provider: row.provider,
    provider_user_id: row.provider_user_id,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

export function mapStaffRows(rows: StaffRow[]): Staff[] {
  return rows.map(mapStaffRow);
}
