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
  language: string;
  cgstRate: number;
  sgstRate: number;
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
    language: row.language,
    cgstRate: Number(row.cgst_rate),
    sgstRate: Number(row.sgst_rate),
  };
}

export function mapSettingsProfile(dto: SettingsUpdateDTO): SettingsProfileUpdateDTO {
  return {
    name: dto.name,
    phone: dto.phone,
    address: dto.address,
    logoUrl: dto.logoUrl,
    language: dto.language,
  };
}

export function mapSettingsTax(dto: SettingsUpdateDTO): SettingsTaxUpdateDTO {
  return {
    gstNumber: dto.gstNumber,
    cgstRate: dto.cgstRate,
    sgstRate: dto.sgstRate,
  };
}
