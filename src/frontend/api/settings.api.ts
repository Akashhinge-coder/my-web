import { apiFetch } from "@/frontend/api/http";

export interface RestaurantSettings {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  gstNumber: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroFocusX: number;
  heroFocusY: number;
  heroOverlayOpacity: number;
  heroEnabled: boolean;
  language: string;
  cgstRate: number;
  sgstRate: number;
  sessionMode: "open" | "host_approval";
  maxReservationDaysInAdvance: number;
  onlineReservationLimitPercent: number;
}

export interface SettingsProfilePayload {
  name: string;
  phone: string;
  address?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  heroFocusX?: number;
  heroFocusY?: number;
  heroOverlayOpacity?: number;
  heroEnabled?: boolean;
  language: string;
  sessionMode?: "open" | "host_approval";
}

export interface SettingsTaxPayload {
  gstNumber?: string | null;
  cgstRate: number;
  sgstRate: number;
}

export type SettingsPayload = SettingsProfilePayload & SettingsTaxPayload & {
  maxReservationDaysInAdvance?: number;
  onlineReservationLimitPercent?: number;
};

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

  uploadMedia(type: "logo" | "hero", formData: FormData) {
    return fetch(`/api/v1/settings/media?type=${type}`, {
      method: "POST",
      body: formData,
    });
  },

  removeMedia(type: "logo" | "hero") {
    return fetch(`/api/v1/settings/media?type=${type}`, {
      method: "DELETE",
    });
  },
};
