import { apiFetch } from "@/frontend/api/http";

export interface HappyHour {
  id: string;
  name: string;
  discountType: "flat" | "percent";
  discountValue: number;
  days: string[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  categoryIds: string[];
  itemIds: string[];
}

export interface HappyHourPayload {
  name: string;
  discountType: "flat" | "percent";
  discountValue: number;
  days: string[];
  startTime: string;
  endTime: string;
  isActive?: boolean;
  categoryIds?: string[];
  itemIds?: string[];
}

export const happyHoursApi = {
  getAll() {
    return apiFetch<HappyHour[]>("/api/v1/happy-hours");
  },

  create(payload: HappyHourPayload) {
    return apiFetch<HappyHour>("/api/v1/happy-hours", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: Partial<HappyHourPayload>) {
    return apiFetch<HappyHour>(`/api/v1/happy-hours/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string) {
    return apiFetch<void>(`/api/v1/happy-hours/${id}`, {
      method: "DELETE",
    });
  },
};

