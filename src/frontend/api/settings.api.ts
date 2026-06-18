import { apiFetch } from "@/frontend/api/http";

export interface RestaurantSettings {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  gstNumber: string | null;
  logoUrl: string | null;
  language: string;
  cgstRate: number;
  sgstRate: number;
  sessionMode: "open" | "host_approval";
}

export interface SettingsProfilePayload {
  name: string;
  phone: string;
  address?: string | null;
  logoUrl?: string | null;
  language: string;
  sessionMode?: "open" | "host_approval";
}

export interface SettingsTaxPayload {
  gstNumber?: string | null;
  cgstRate: number;
  sgstRate: number;
}

export type SettingsPayload = SettingsProfilePayload & SettingsTaxPayload;

export const settingsApi = {
  get() {
    return apiFetch<RestaurantSettings>("/api/v1/settings");
  },

  update(payload: SettingsPayload) {
    return apiFetch<RestaurantSettings>("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateProfile(payload: SettingsProfilePayload) {
    return apiFetch<RestaurantSettings>("/api/v1/settings/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateTax(payload: SettingsTaxPayload) {
    return apiFetch<RestaurantSettings>("/api/v1/settings/tax", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
