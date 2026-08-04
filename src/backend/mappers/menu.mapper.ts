import type {
  ArAssetRow,
  ArAssetSummaryRow,
  CategoryRow,
  ComboRow,
  DishPriceRow,
  DishRow,
  RestaurantMenuRow,
  TableMenuRow,
} from "@/types/menu-db";
import type {
  AdminDish,
  AdminMenuBundle,
  CustomerDish,
  CustomerMenuBundle,
  DishArViewPayload,
} from "@/types/menu";
import type { Category, Combo, Dish, DishARAsset, FoodType } from "@/types/domain";

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toFoodType(value: string): FoodType {
  if (value === "veg" || value === "non_veg" || value === "vegan" || value === "jain") {
    return value;
  }
  return "veg";
}

function toDishSize(value: string): "S" | "M" | "L" {
  if (value === "S" || value === "L") return value;
  return "M";
}

function isCategoryRow(row: unknown): row is CategoryRow {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    "restaurant_id" in row &&
    "name" in row
  );
}

function isDishRow(row: unknown): row is DishRow & Record<string, unknown> {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    "restaurant_id" in row &&
    "category_id" in row &&
    "name" in row
  );
}

function isComboRow(row: unknown): row is ComboRow {
  return (
    typeof row === "object" &&
    row !== null &&
    "id" in row &&
    "restaurant_id" in row &&
    "dish_ids" in row
  );
}

function isArAssetRow(row: unknown): row is ArAssetRow {
  return typeof row === "object" && row !== null && "dish_id" in row;
}

function parseArSummaryRows(
  value: unknown
): ArAssetSummaryRow[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (item): item is ArAssetSummaryRow =>
      typeof item === "object" &&
      item !== null &&
      "is_published" in item &&
      typeof (item as ArAssetSummaryRow).is_published === "boolean"
  );
}

function parseCategoryName(value: unknown): { name: string } | null {
  if (typeof value === "object" && value !== null && "name" in value) {
    const name = (value as { name: unknown }).name;
    return typeof name === "string" ? { name } : null;
  }
  return null;
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    name_hindi: row.name_hindi,
    sort_order: row.sort_order,
    is_active: row.is_active,
  };
}

export function mapCategoryRows(rows: unknown[]): Category[] {
  return rows.filter(isCategoryRow).map(mapCategoryRow);
}

export function mapDishRow(row: DishRow & Record<string, unknown>): Dish {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    category_id: row.category_id,
    name: row.name,
    name_hindi: row.name_hindi,
    description: row.description,
    description_hindi: row.description_hindi,
    price: toNumber(row.price),
    image_url: row.image_url,
    image_focus_x: toNumber((row.image_focus_x as number | undefined) ?? 0.5),
    image_focus_y: toNumber((row.image_focus_y as number | undefined) ?? 0.5),
    food_type: toFoodType(row.food_type),
    spice_level: row.spice_level,
    is_available: row.is_available,
    is_special: row.is_special,
    allergy_tags: row.allergy_tags ?? [],
    dish_size: toDishSize(row.dish_size),
    ar_enabled: row.ar_enabled,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export function mapCustomerDishRow(row: DishRow & Record<string, unknown>): CustomerDish {
  return {
    ...mapDishRow(row),
    dish_ar_assets: parseArSummaryRows(row.dish_ar_assets),
  };
}

export function mapAdminDishRow(row: DishRow & Record<string, unknown>): AdminDish {
  return {
    ...mapDishRow(row),
    categories: parseCategoryName(row.categories),
    dish_ar_assets: parseArSummaryRows(row.dish_ar_assets),
  };
}

export function mapCustomerDishRows(rows: unknown[]): CustomerDish[] {
  return (rows.filter(isDishRow) as Array<DishRow & Record<string, unknown>>).map(mapCustomerDishRow);
}

export function mapAdminDishRows(rows: unknown[]): AdminDish[] {
  return (rows.filter(isDishRow) as Array<DishRow & Record<string, unknown>>).map(mapAdminDishRow);
}

export function mapDishPriceRow(row: DishPriceRow): {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  is_available: boolean;
} {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    price: toNumber(row.price),
    is_available: row.is_available,
  };
}

export function mapDishPriceRows(
  rows: unknown[]
): Array<{ id: string; name: string; categoryId: string; price: number; is_available: boolean }> {
  return rows
    .filter(
      (row): row is DishPriceRow =>
        typeof row === "object" &&
        row !== null &&
        "id" in row &&
        "name" in row &&
        "category_id" in row &&
        "price" in row &&
        "is_available" in row
    )
    .map(mapDishPriceRow);
}

export function mapArAssetRow(row: ArAssetRow): DishARAsset {
  return {
    id: row.id,
    dish_id: row.dish_id,
    angle_front: row.angle_front,
    angle_back: row.angle_back,
    angle_left: row.angle_left,
    angle_right: row.angle_right,
    angle_top: row.angle_top,
    is_published: row.is_published,
    updated_at: row.updated_at,
  };
}

export function mapArAssetRowNullable(row: unknown): DishARAsset | null {
  if (!row || !isArAssetRow(row)) return null;
  return mapArAssetRow(row);
}

export function mapComboRow(row: ComboRow): Combo {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    combo_price: toNumber(row.combo_price),
    dish_ids: Array.isArray(row.dish_ids) ? row.dish_ids : [],
    savings_amount: toNumber(row.savings_amount),
    is_active: row.is_active,
  };
}

export function mapComboRows(rows: unknown[]): Combo[] {
  return rows.filter(isComboRow).map(mapComboRow);
}

export function mapRestaurantMenuRow(row: RestaurantMenuRow): CustomerMenuBundle["restaurant"] {
  return {
    id: row.id,
    name: row.name,
    logo_url: row.logo_url ?? null,
    hero_image_url: row.hero_image_url ?? null,
    hero_focus_x: toNumber(row.hero_focus_x ?? 0.5),
    hero_focus_y: toNumber(row.hero_focus_y ?? 0.5),
    hero_overlay_opacity: toNumber(row.hero_overlay_opacity ?? 0.35),
    hero_enabled: row.hero_enabled ?? true,
  };
}
export function mapTableMenuRow(row: TableMenuRow): CustomerMenuBundle["table"] {
  return { table_number: row.table_number };
}


export function buildAdminMenuBundle(
  categories: Category[],
  dishes: AdminDish[]
): AdminMenuBundle {
  return { categories, dishes };
}

export function buildCustomerMenuBundle(params: {
  restaurant: CustomerMenuBundle["restaurant"];
  table: CustomerMenuBundle["table"];
  categories: Category[];
  dishes: CustomerDish[];
  combos?: Combo[];
}): CustomerMenuBundle {
  return params;
}

export function buildDishArViewPayload(
  dish: CustomerDish,
  arAsset: DishARAsset | null
): { dish: CustomerDish; arAsset: DishARAsset | null } {
  return { dish, arAsset };
}
