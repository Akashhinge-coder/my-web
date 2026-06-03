import type { Category, Combo, Dish, DishARAsset } from "@/types/domain";
import type { ArAssetSummaryRow } from "@/types/menu-db";

/** Customer menu dish with nested AR summary from join. */
export interface CustomerDish extends Dish {
  dish_ar_assets?: ArAssetSummaryRow[];
}

/** Admin menu dish with category name + AR publish flag. */
export interface AdminDish extends Dish {
  categories?: { name: string } | null;
  dish_ar_assets?: Array<Pick<DishARAsset, "is_published">>;
}

export interface CustomerMenuBundle {
  restaurant: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  table: {
    table_number: string;
  };
  categories: Category[];
  dishes: CustomerDish[];
}

export interface AdminMenuBundle {
  categories: Category[];
  dishes: AdminDish[];
}

export interface ComboListPayload {
  combos: Combo[];
  dishes: Dish[];
}

export interface DishArViewPayload {
  dish: CustomerDish;
  arAsset: DishARAsset | null;
}

export function dishHasPublishedAr(dish: CustomerDish | AdminDish): boolean {
  return dish.dish_ar_assets?.[0]?.is_published === true;
}
