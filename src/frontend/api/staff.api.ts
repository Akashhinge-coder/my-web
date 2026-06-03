import { apiFetch } from "@/frontend/api/http";
import type { Staff, UserRole } from "@/types/domain";

export interface CreateStaffBody {
  name: string;
  role: UserRole;
  phone?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
}

export interface UpdateStaffBody {
  name?: string;
  role?: UserRole;
  phone?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
}

export const staffApi = {
  list(): Promise<Staff[]> {
    return apiFetch<Staff[]>("/api/v1/staff");
  },

  create(body: CreateStaffBody): Promise<Staff> {
    return apiFetch<Staff>("/api/v1/staff", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  update(staffId: string, body: UpdateStaffBody): Promise<Staff> {
    return apiFetch<Staff>(`/api/v1/staff/${staffId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete(staffId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/staff/${staffId}`, {
      method: "DELETE",
    });
  },
};

