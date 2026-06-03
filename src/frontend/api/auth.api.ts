import { apiFetch } from "@/frontend/api/http";

export interface AdminSessionRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active?: boolean;
}

export interface AdminSession {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  restaurant: AdminSessionRestaurant;
  role: string;
}

export const authApi = {
  getSession() {
    return apiFetch<AdminSession>("/api/v1/auth/session");
  },
};
