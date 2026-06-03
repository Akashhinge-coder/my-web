import { createAdminClient } from "@/config/supabase/server";
import {
  mapAdminDishRow,
  mapAdminDishRows,
  mapArAssetRow,
  mapArAssetRowNullable,
  mapCategoryRow,
  mapCategoryRows,
  mapComboRow,
  mapComboRows,
  mapCustomerDishRow,
  mapCustomerDishRows,
  mapDishPriceRows,
} from "@/backend/mappers/menu.mapper";
import type {
  CreateCategoryDTO,
  CreateComboDTO,
  CreateDishDTO,
  UpdateCategoryDTO,
  UpdateComboDTO,
  UpdateDishDTO,
  UpsertArAssetDTO,
} from "@/backend/validations/menu.schema";
import type { AdminDish, CustomerDish } from "@/types/menu";
import type { Category, Combo, DishARAsset } from "@/types/domain";
import type { ArAssetRow, CategoryRow, ComboRow, DishRow } from "@/types/menu-db";

const CUSTOMER_DISH_SELECT =
  "*, dish_ar_assets(is_published, angle_front, angle_back, angle_left, angle_right, angle_top)";

const ADMIN_DISH_SELECT = "*, categories(name), dish_ar_assets(is_published)";

export class MenuRepository {
  static async listCategories(restaurantId: string, activeOnly = false): Promise<Category[]> {
    const supabase = createAdminClient();
    let query = supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw error;
    return mapCategoryRows(data ?? []);
  }

  static async createCategory(restaurantId: string, dto: CreateCategoryDTO): Promise<Category> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        restaurant_id: restaurantId,
        name: dto.name.trim(),
        name_hindi: dto.nameHindi ?? null,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapCategoryRow(data as CategoryRow);
  }

  static async updateCategory(
    restaurantId: string,
    categoryId: string,
    dto: UpdateCategoryDTO
  ): Promise<Category> {
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.nameHindi !== undefined) patch.name_hindi = dto.nameHindi;
    if (dto.sortOrder !== undefined) patch.sort_order = dto.sortOrder;
    if (dto.isActive !== undefined) patch.is_active = dto.isActive;

    const { data, error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", categoryId)
      .eq("restaurant_id", restaurantId)
      .select("*")
      .single();

    if (error) throw error;
    return mapCategoryRow(data as CategoryRow);
  }

  static async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  }

  static async countDishesInCategory(restaurantId: string, categoryId: string): Promise<number> {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("dishes")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("category_id", categoryId);

    if (error) throw error;
    return count ?? 0;
  }

  static async findDishesByIds(
    restaurantId: string,
    dishIds: string[]
  ): Promise<Array<{ id: string; categoryId: string; price: number; is_available: boolean }>> {
    if (dishIds.length === 0) return [];
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("dishes")
      .select("id, category_id, name, price, food_type, image_url, is_available")
      .eq("restaurant_id", restaurantId)
      .in("id", dishIds);

    if (error) throw error;
    return mapDishPriceRows(data ?? []);
  }

  static async listDishes(
    restaurantId: string,
    options: { availableOnly?: boolean; admin?: boolean } = {}
  ): Promise<AdminDish[] | CustomerDish[]> {
    const supabase = createAdminClient();
    let query = supabase
      .from("dishes")
      .select(options.admin ? ADMIN_DISH_SELECT : CUSTOMER_DISH_SELECT)
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (options.availableOnly) query = query.eq("is_available", true);

    const { data, error } = await query;
    if (error) throw error;

    if (options.admin) {
      return mapAdminDishRows(data ?? []);
    }
    return mapCustomerDishRows(data ?? []);
  }

  static async findDishById(
    restaurantId: string,
    dishId: string,
    options: { includeAr?: boolean } = {}
  ): Promise<CustomerDish> {
    const supabase = createAdminClient();
    const select: string = options.includeAr ? CUSTOMER_DISH_SELECT : "*";

    const { data, error } = await supabase
      .from("dishes")
      .select(select)
      .eq("id", dishId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (error) throw error;
    return mapCustomerDishRow(data as unknown as DishRow & Record<string, unknown>);
  }

  static async createDish(restaurantId: string, dto: CreateDishDTO): Promise<AdminDish> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("dishes")
      .insert({
        restaurant_id: restaurantId,
        category_id: dto.categoryId,
        name: dto.name.trim(),
        name_hindi: dto.nameHindi ?? null,
        description: dto.description ?? null,
        description_hindi: dto.descriptionHindi ?? null,
        price: dto.price,
        food_type: dto.foodType,
        spice_level: dto.spiceLevel ?? 2,
        is_available: dto.isAvailable ?? true,
        is_special: dto.isSpecial ?? false,
        allergy_tags: dto.allergyTags ?? [],
        dish_size: dto.dishSize ?? "M",
        image_url: dto.imageUrl || null,
        sort_order: dto.sortOrder ?? 0,
      })
      .select(ADMIN_DISH_SELECT)
      .single();

    if (error) throw error;
    return mapAdminDishRow(data as DishRow & Record<string, unknown>);
  }

  static async updateDish(
    restaurantId: string,
    dishId: string,
    dto: UpdateDishDTO
  ): Promise<AdminDish> {
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.nameHindi !== undefined) patch.name_hindi = dto.nameHindi;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.descriptionHindi !== undefined) patch.description_hindi = dto.descriptionHindi;
    if (dto.price !== undefined) patch.price = dto.price;
    if (dto.categoryId !== undefined) patch.category_id = dto.categoryId;
    if (dto.foodType !== undefined) patch.food_type = dto.foodType;
    if (dto.spiceLevel !== undefined) patch.spice_level = dto.spiceLevel;
    if (dto.isAvailable !== undefined) patch.is_available = dto.isAvailable;
    if (dto.isSpecial !== undefined) patch.is_special = dto.isSpecial;
    if (dto.allergyTags !== undefined) patch.allergy_tags = dto.allergyTags;
    if (dto.dishSize !== undefined) patch.dish_size = dto.dishSize;
    if (dto.imageUrl !== undefined) patch.image_url = dto.imageUrl || null;
    if (dto.sortOrder !== undefined) patch.sort_order = dto.sortOrder;

    const { data, error } = await supabase
      .from("dishes")
      .update(patch)
      .eq("id", dishId)
      .eq("restaurant_id", restaurantId)
      .select(ADMIN_DISH_SELECT)
      .single();

    if (error) throw error;
    return mapAdminDishRow(data as DishRow & Record<string, unknown>);
  }

  static async setDishAvailability(
    restaurantId: string,
    dishId: string,
    isAvailable: boolean
  ): Promise<AdminDish> {
    return this.updateDish(restaurantId, dishId, { isAvailable });
  }

  static async deleteDish(restaurantId: string, dishId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("dishes")
      .delete()
      .eq("id", dishId)
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  }

  static async getArAssetByDishId(
    restaurantId: string,
    dishId: string
  ): Promise<DishARAsset | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("dish_ar_assets")
      .select("*, dishes!inner(restaurant_id)")
      .eq("dish_id", dishId)
      .eq("dishes.restaurant_id", restaurantId)
      .maybeSingle();

    if (error) throw error;
    return mapArAssetRowNullable(data);
  }

  static async upsertArAsset(
    restaurantId: string,
    dishId: string,
    dto: UpsertArAssetDTO
  ): Promise<DishARAsset> {
    const supabase = createAdminClient();
    const payload = {
      dish_id: dishId,
      angle_front: dto.angleFront || null,
      angle_back: dto.angleBack || null,
      angle_left: dto.angleLeft || null,
      angle_right: dto.angleRight || null,
      angle_top: dto.angleTop || null,
      is_published: dto.isPublished ?? false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("dish_ar_assets")
      .upsert(payload, { onConflict: "dish_id" })
      .select("*, dishes!inner(restaurant_id)")
      .eq("dishes.restaurant_id", restaurantId)
      .single();

    if (error) throw error;
    return mapArAssetRow(data as ArAssetRow);
  }

  static async setDishArEnabled(
    restaurantId: string,
    dishId: string,
    enabled: boolean
  ): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("dishes")
      .update({ ar_enabled: enabled })
      .eq("id", dishId)
      .eq("restaurant_id", restaurantId);
    if (error) throw error;
  }

  static async listCombos(restaurantId: string): Promise<Combo[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("combos")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name");

    if (error) throw error;
    return mapComboRows(data ?? []);
  }

  static async findComboById(restaurantId: string, comboId: string): Promise<Combo | null> {
    const combos = await this.listCombos(restaurantId);
    return combos.find((c) => c.id === comboId) ?? null;
  }

  static async createCombo(
    restaurantId: string,
    dto: CreateComboDTO & { savingsAmount: number }
  ): Promise<Combo> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("combos")
      .insert({
        restaurant_id: restaurantId,
        name: dto.name.trim(),
        combo_price: dto.comboPrice,
        dish_ids: dto.dishIds,
        savings_amount: dto.savingsAmount,
        is_active: dto.isActive ?? true,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapComboRow(data as ComboRow);
  }

  static async updateCombo(
    restaurantId: string,
    comboId: string,
    dto: UpdateComboDTO & { savingsAmount?: number }
  ): Promise<Combo> {
    const supabase = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.comboPrice !== undefined) patch.combo_price = dto.comboPrice;
    if (dto.dishIds !== undefined) patch.dish_ids = dto.dishIds;
    if (dto.savingsAmount !== undefined) patch.savings_amount = dto.savingsAmount;
    if (dto.isActive !== undefined) patch.is_active = dto.isActive;

    const { data, error } = await supabase
      .from("combos")
      .update(patch)
      .eq("id", comboId)
      .eq("restaurant_id", restaurantId)
      .select("*")
      .single();

    if (error) throw error;
    return mapComboRow(data as ComboRow);
  }

  static async deleteCombo(restaurantId: string, comboId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("combos")
      .delete()
      .eq("id", comboId)
      .eq("restaurant_id", restaurantId);

    if (error) throw error;
  }
}
