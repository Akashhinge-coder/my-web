import type { Waitlist } from "@/types/domain";

export interface WaitlistRow {
  id: string;
  restaurant_id: string;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  joined_at: string;
  notified_at: string | null;
  status: string;
}

function toStatus(value: string): Waitlist["status"] {
  if (value === "waiting" || value === "notified" || value === "seated" || value === "left") {
    return value;
  }
  return "waiting";
}

export function mapWaitlistRow(row: WaitlistRow): Waitlist {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    guest_name: row.guest_name,
    guest_phone: row.guest_phone,
    party_size: row.party_size,
    joined_at: row.joined_at,
    notified_at: row.notified_at,
    status: toStatus(row.status),
  };
}

export function mapWaitlistRows(rows: WaitlistRow[]): Waitlist[] {
  return rows.map(mapWaitlistRow);
}
