import { apiFetch } from "@/frontend/api/http";
import type {
  CreateComboDTO,
  CreateDishDTO,
  UpdateDishDTO,
  UpsertArAssetDTO,
} from "@/types/menu-dto";
import type {
  AdminMenuBundle,
  ComboListPayload,
  CustomerMenuBundle,
  DishArViewPayload,
} from "@/types/menu";
import type { Category, Combo, DishARAsset } from "@/types/domain";
import type { AdminDish, CustomerDish } from "@/types/menu";

function scoped(restaurantId: string, path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}restaurantId=${restaurantId}`;
}

export const menuApi = {
  getCustomerMenu(slug: string, tableId: string): Promise<CustomerMenuBundle> {
    const q = new URLSearchParams({ slug, tableId, view: "customer" });
    return apiFetch<CustomerMenuBundle>(`/api/v1/menu?${q}`);
  },

  getAdminMenu(restaurantId: string): Promise<AdminMenuBundle> {
    const q = new URLSearchParams({ restaurantId, view: "admin" });
    return apiFetch<AdminMenuBundle>(`/api/v1/menu?${q}`);
  },

  listCategories(restaurantId: string, activeOnly = false): Promise<Category[]> {
    const q = new URLSearchParams({ restaurantId });
    if (activeOnly) q.set("activeOnly", "true");
    return apiFetch<Category[]>(`/api/v1/menu/categories?${q}`);
  },

  createCategory(
    restaurantId: string,
    body: { name: string; sortOrder?: number }
  ): Promise<Category> {
    return apiFetch<Category>(scoped(restaurantId, "/api/v1/menu/categories"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  listDishes(
    restaurantId: string,
    options?: { admin?: boolean; availableOnly?: boolean }
  ): Promise<AdminDish[]> {
    const q = new URLSearchParams({ restaurantId });
    if (options?.admin) q.set("admin", "true");
    if (options?.availableOnly) q.set("availableOnly", "true");
    return apiFetch<AdminDish[]>(`/api/v1/menu/dishes?${q}`);
  },

  getDish(restaurantId: string, dishId: string, includeAr = false): Promise<CustomerDish> {
    const q = new URLSearchParams({ restaurantId });
    if (includeAr) q.set("includeAr", "true");
    return apiFetch<CustomerDish>(`/api/v1/menu/dishes/${dishId}?${q}`);
  },

  createDish(restaurantId: string, body: CreateDishDTO): Promise<AdminDish> {
    return apiFetch<AdminDish>(scoped(restaurantId, "/api/v1/menu/dishes"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  updateDish(restaurantId: string, dishId: string, body: UpdateDishDTO): Promise<AdminDish> {
    return apiFetch<AdminDish>(scoped(restaurantId, `/api/v1/menu/dishes/${dishId}`), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  toggleDishAvailability(
    restaurantId: string,
    dishId: string,
    isAvailable: boolean
  ): Promise<AdminDish> {
    return apiFetch<AdminDish>(
      scoped(restaurantId, `/api/v1/menu/dishes/${dishId}/availability`),
      { method: "PATCH", body: JSON.stringify({ isAvailable }) }
    );
  },

  deleteDish(restaurantId: string, dishId: string): Promise<void> {
    return apiFetch<void>(scoped(restaurantId, `/api/v1/menu/dishes/${dishId}`), {
      method: "DELETE",
    });
  },

  getDishAr(restaurantId: string, dishId: string): Promise<DishArViewPayload> {
    return apiFetch<DishArViewPayload>(
      scoped(restaurantId, `/api/v1/menu/dishes/${dishId}/ar`)
    );
  },

  upsertDishAr(
    restaurantId: string,
    dishId: string,
    body: UpsertArAssetDTO
  ): Promise<DishARAsset> {
    return apiFetch<DishARAsset>(scoped(restaurantId, `/api/v1/menu/dishes/${dishId}/ar`), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  listCombos(restaurantId: string): Promise<ComboListPayload> {
    return apiFetch<ComboListPayload>(scoped(restaurantId, "/api/v1/menu/combos"));
  },

  createCombo(restaurantId: string, body: CreateComboDTO): Promise<Combo> {
    return apiFetch<Combo>(scoped(restaurantId, "/api/v1/menu/combos"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  toggleCombo(restaurantId: string, comboId: string, isActive: boolean): Promise<Combo> {
    return apiFetch<Combo>(scoped(restaurantId, `/api/v1/menu/combos/${comboId}`), {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },

  deleteCombo(restaurantId: string, comboId: string): Promise<void> {
    return apiFetch<void>(scoped(restaurantId, `/api/v1/menu/combos/${comboId}`), {
      method: "DELETE",
    });
  },
};


/** Maps admin form state (snake_case) to API DTO (camelCase). */
export function toCreateDishDto(form: {
  name: string;
  name_hindi: string;
  description: string;
  price: string;
  category_id: string;
  food_type: string;
  spice_level: number;
  is_available: boolean;
  is_special: boolean;
  allergy_tags: string[];
  dish_size: string;
  image_url: string;
}): CreateDishDTO {
  return {
    name: form.name.trim(),
    nameHindi: form.name_hindi || null,
    description: form.description || null,
    price: parseFloat(form.price),
    categoryId: form.category_id,
    foodType: form.food_type as CreateDishDTO["foodType"],
    spiceLevel: form.spice_level,
    isAvailable: form.is_available,
    isSpecial: form.is_special,
    allergyTags: form.allergy_tags,
    dishSize: form.dish_size as CreateDishDTO["dishSize"],
    imageUrl: form.image_url || null,
  };
}
