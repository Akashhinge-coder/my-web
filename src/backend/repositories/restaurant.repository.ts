import { createClient } from "@/config/supabase/server";
import type {
  SettingsProfileUpdateDTO,
  SettingsTaxUpdateDTO,
} from "@/backend/validations/settings.validation";

export interface RestaurantSettingsRow {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  gst_number: string | null;
  logo_url: string | null;
  language: string;
  cgst_rate: number;
  sgst_rate: number;
}

export class RestaurantRepository {
  static async getById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("restaurants").select("id, name, slug, logo_url").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  static async getBySlug(slug: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("restaurants").select("*").eq("slug", slug).single();
    if (error) throw error;
    return data;
  }

  static async getFirst() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("restaurants").select("id, name, slug, logo_url, is_active").limit(1).single();
    if (error) throw error;
    return data;
  }

  static async getSettingsById(id: string): Promise<RestaurantSettingsRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, phone, address, gst_number, logo_url, language, cgst_rate, sgst_rate")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as RestaurantSettingsRow;
  }

  static async updateProfile(
    restaurantId: string,
    dto: SettingsProfileUpdateDTO
  ): Promise<RestaurantSettingsRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        name: dto.name,
        phone: dto.phone,
        address: dto.address ?? null,
        logo_url: dto.logoUrl ?? null,
        language: dto.language,
      })
      .eq("id", restaurantId)
      .select("id, name, slug, phone, address, gst_number, logo_url, language, cgst_rate, sgst_rate")
      .single();

    if (error) throw error;
    return data as RestaurantSettingsRow;
  }

  static async updateTax(
    restaurantId: string,
    dto: SettingsTaxUpdateDTO
  ): Promise<RestaurantSettingsRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("restaurants")
      .update({
        gst_number: dto.gstNumber ?? null,
        cgst_rate: dto.cgstRate,
        sgst_rate: dto.sgstRate,
      })
      .eq("id", restaurantId)
      .select("id, name, slug, phone, address, gst_number, logo_url, language, cgst_rate, sgst_rate")
      .single();

    if (error) throw error;
    return data as RestaurantSettingsRow;
  }
}
