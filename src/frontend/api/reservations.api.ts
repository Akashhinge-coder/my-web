import { apiFetch } from "@/frontend/api/http";
import type { ReservationStatus } from "@/types/domain";
import type { ReservationsPageData, ReservationWithTable } from "@/types/reservations";

export interface CreateReservationBody {
  guest_name: string;
  guest_phone: string;
  party_size: number;
  reserved_at: string;
  notes?: string | null;
  table_id?: string | null;
}

export const reservationsApi = {
  getPageData(): Promise<ReservationsPageData> {
    return apiFetch<ReservationsPageData>("/api/v1/reservations");
  },

  create(body: CreateReservationBody): Promise<ReservationWithTable> {
    return apiFetch<ReservationWithTable>("/api/v1/reservations", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateStatus(id: string, status: ReservationStatus): Promise<ReservationWithTable> {
    return apiFetch<ReservationWithTable>(`/api/v1/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
