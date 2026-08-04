import { apiFetch } from "@/frontend/api/http";
import type { Staff } from "@/types/domain";

export interface CreateStaffBody {
  name: string;
  role_id: string;
  phone?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  permission_ids?: string[];
}

export interface UpdateStaffBody {
  name?: string;
  role_id?: string;
  phone?: string | null;
  shift_start?: string | null;
  shift_end?: string | null;
  permission_ids?: string[];
}

export const staffApi = {
  list(): Promise<Staff[]> {
    return apiFetch<Staff[]>("/api/v1/staff");
  },

  create(body: CreateStaffBody): Promise<{ staff: Staff; credentials?: { username: string; password: string } }> {
    return apiFetch<{ staff: Staff; credentials?: { username: string; password: string } }>("/api/v1/staff", {
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

  resetPassword(staffId: string): Promise<{ password: string }> {
    return apiFetch<{ password: string }>(`/api/v1/staff/${staffId}/reset-password`, {
      method: "POST",
    });
  },
};
