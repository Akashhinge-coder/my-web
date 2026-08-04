import type { RestaurantSettingsRow } from "@/backend/repositories/restaurant.repository";
import type {
  SettingsProfileUpdateDTO,
  SettingsTaxUpdateDTO,
  SettingsUpdateDTO,
} from "@/backend/validations/settings.validation";

export interface RestaurantSettingsDTO {
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
}

export function mapRestaurantSettings(row: RestaurantSettingsRow): RestaurantSettingsDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    phone: row.phone,
    address: row.address,
    gstNumber: row.gst_number,
    logoUrl: row.logo_url,
    heroImageUrl: row.hero_image_url ?? null,
    heroFocusX: Number(row.hero_focus_x ?? 0.5),
    heroFocusY: Number(row.hero_focus_y ?? 0.5),
    heroOverlayOpacity: Number(row.hero_overlay_opacity ?? 0.35),
    heroEnabled: row.hero_enabled ?? true,
    language: row.language,
    cgstRate: Number(row.cgst_rate),
    sgstRate: Number(row.sgst_rate),
    sessionMode: row.session_mode,
  };
}

export function mapSettingsProfile(dto: SettingsUpdateDTO): SettingsProfileUpdateDTO {
  return {
    name: dto.name,
    phone: dto.phone,
    address: dto.address,
    logoUrl: dto.logoUrl,
    heroImageUrl: dto.heroImageUrl,
    heroFocusX: dto.heroFocusX,
    heroFocusY: dto.heroFocusY,
    heroOverlayOpacity: dto.heroOverlayOpacity,
    heroEnabled: dto.heroEnabled,
    language: dto.language,
    sessionMode: dto.sessionMode,
  };
}

export function mapSettingsTax(dto: SettingsUpdateDTO): SettingsTaxUpdateDTO {
  return {
    gstNumber: dto.gstNumber,
    cgstRate: dto.cgstRate,
    sgstRate: dto.sgstRate,
  };
}
