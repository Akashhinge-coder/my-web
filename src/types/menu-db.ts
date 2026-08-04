/** Raw Supabase row shapes (snake_case) for menu tables. */

export interface CategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  name_hindi: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface DishRow {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  name_hindi: string | null;
  description: string | null;
  description_hindi: string | null;
  price: number | string;
  image_url: string | null;
  food_type: string;
  spice_level: number;
  is_available: boolean;
  is_special: boolean;
  allergy_tags: string[] | null;
  dish_size: string;
  ar_enabled: boolean;
  sort_order: number;
  created_at: string;
}

export interface DishPriceRow {
  id: string;
  category_id: string;
  name: string;
  price: number | string;
  food_type: string;
  image_url: string | null;
  is_available: boolean;
}

export interface ArAssetRow {
  id: string;
  dish_id: string;
  angle_front: string | null;
  angle_back: string | null;
  angle_left: string | null;
  angle_right: string | null;
  angle_top: string | null;
  is_published: boolean;
  updated_at: string;
}

export interface ArAssetSummaryRow {
  is_published: boolean;
  angle_front?: string | null;
  angle_back?: string | null;
  angle_left?: string | null;
  angle_right?: string | null;
  angle_top?: string | null;
}

export interface ComboRow {
  id: string;
  restaurant_id: string;
  name: string;
  combo_price: number | string;
  dish_ids: string[];
  savings_amount: number | string;
  is_active: boolean;
}

export interface RestaurantMenuRow {
  id: string;
  name: string;
  logo_url: string | null;
  hero_image_url?: string | null;
  hero_focus_x?: number | string;
  hero_focus_y?: number | string;
  hero_overlay_opacity?: number | string;
  hero_enabled?: boolean;
  gst_number?: string | null;
  phone?: string;
  cgst_rate?: number | string;
  sgst_rate?: number | string;
}

export interface TableMenuRow {
  table_number: string;
  restaurant_id?: string;
  current_session_id?: string | null;
}
