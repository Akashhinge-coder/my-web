import { ValidationError } from "@/backend/errors/ValidationError";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import {
  buildAdminMenuBundle,
  buildCustomerMenuBundle,
  buildDishArViewPayload,
  mapRestaurantMenuRow,
  mapTableMenuRow,
} from "@/backend/mappers/menu.mapper";
import { MenuRepository } from "@/backend/repositories/menu.repository";
import { RestaurantRepository } from "@/backend/repositories/restaurant.repository";
import { TableRepository } from "@/backend/repositories/table.repository";
import type {
  CreateCategoryDTO,
  CreateComboDTO,
  CreateDishDTO,
  ListMenuQuery,
  UpdateCategoryDTO,
  UpdateComboDTO,
  UpdateDishDTO,
  UpsertArAssetDTO,
} from "@/backend/validations/menu.schema";
import type {
  AdminMenuBundle,
  ComboListPayload,
  CustomerMenuBundle,
  DishArViewPayload,
} from "@/types/menu";
import type { RestaurantMenuRow, TableMenuRow } from "@/types/menu-db";
import type { Category, Combo, DishARAsset } from "@/types/domain";
import type { AdminDish, CustomerDish } from "@/types/menu";

export class MenuService {
  static async resolveRestaurantId(query: ListMenuQuery): Promise<string> {
    if (query.restaurantId) return query.restaurantId;
    if (!query.slug) throw new ValidationError("slug or restaurantId is required");
    const restaurant = await RestaurantRepository.getBySlug(query.slug);
    if (!restaurant) throw new NotFoundError("Restaurant not found");
    return String(restaurant.id);
  }

  static async getMenu(
    query: ListMenuQuery
  ): Promise<AdminMenuBundle | CustomerMenuBundle> {
    const restaurantId = await this.resolveRestaurantId(query);

    if (query.view === "customer") {
      if (!query.slug) {
        throw new ValidationError("slug is required for customer menu", { slug: ["Required"] });
      }
      return this.getCustomerMenu(query.slug, query.tableId, restaurantId);
    }

    const [categories, dishes] = await Promise.all([
      MenuRepository.listCategories(restaurantId),
      MenuRepository.listDishes(restaurantId, { admin: true }),
    ]);

    return buildAdminMenuBundle(categories, dishes);
  }

  static async getCustomerMenu(
    slug: string,
    tableId: string | undefined,
    restaurantId: string
  ): Promise<CustomerMenuBundle> {
    const restaurantRow = await RestaurantRepository.getBySlug(slug);
    if (!restaurantRow || String(restaurantRow.id) !== restaurantId) {
      throw new NotFoundError("Restaurant not found");
    }

    let table = { table_number: "—" };
    if (tableId) {
      const row = await TableRepository.findById(tableId);
      if (!row || row.restaurant_id !== restaurantId) {
        throw new NotFoundError("Table not found");
      }
      table = mapTableMenuRow(row as TableMenuRow);
    }

    const [categories, dishes] = await Promise.all([
      MenuRepository.listCategories(restaurantId, true),
      MenuRepository.listDishes(restaurantId, { availableOnly: true }),
    ]);

    return buildCustomerMenuBundle({
      restaurant: mapRestaurantMenuRow(restaurantRow as RestaurantMenuRow),
      table,
      categories,
      dishes: dishes as CustomerDish[],
    });
  }

  static async listCategories(restaurantId: string, activeOnly = false): Promise<Category[]> {
    return MenuRepository.listCategories(restaurantId, activeOnly);
  }

  static async createCategory(restaurantId: string, dto: CreateCategoryDTO) {
    const categories = await MenuRepository.listCategories(restaurantId);
    const sortOrder = dto.sortOrder ?? categories.length;
    return MenuRepository.createCategory(restaurantId, { ...dto, sortOrder });
  }

  static async updateCategory(
    restaurantId: string,
    categoryId: string,
    dto: UpdateCategoryDTO
  ) {
    return MenuRepository.updateCategory(restaurantId, categoryId, dto);
  }

  static async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    const count = await MenuRepository.countDishesInCategory(restaurantId, categoryId);
    if (count > 0) {
      throw new ValidationError("Cannot delete category with dishes", {
        categoryId: ["Remove or reassign dishes first"],
      });
    }
    await MenuRepository.deleteCategory(restaurantId, categoryId);
  }

  static async listDishes(
    restaurantId: string,
    options?: { availableOnly?: boolean; admin?: boolean }
  ): Promise<AdminDish[] | CustomerDish[]> {
    return MenuRepository.listDishes(restaurantId, options);
  }

  static async getDish(
    restaurantId: string,
    dishId: string,
    includeAr = false
  ): Promise<CustomerDish> {
    return MenuRepository.findDishById(restaurantId, dishId, { includeAr });
  }

  static async getDishForAr(
    restaurantId: string,
    dishId: string
  ): Promise<DishArViewPayload> {
    const dish = await this.getDish(restaurantId, dishId, true);
    const arAsset = await MenuRepository.getArAssetByDishId(restaurantId, dishId);
    return buildDishArViewPayload(dish, arAsset);
  }

  static validatePrice(price: number): void {
    if (!Number.isFinite(price) || price <= 0) {
      throw new ValidationError("Price must be greater than zero", { price: ["Invalid price"] });
    }
  }

  static async createDish(restaurantId: string, dto: CreateDishDTO): Promise<AdminDish> {
    this.validatePrice(dto.price);
    await this.assertCategoryBelongsToRestaurant(restaurantId, dto.categoryId);
    return MenuRepository.createDish(restaurantId, dto);
  }

  static async updateDish(
    restaurantId: string,
    dishId: string,
    dto: UpdateDishDTO
  ): Promise<AdminDish> {
    if (dto.price !== undefined) this.validatePrice(dto.price);
    if (dto.categoryId) await this.assertCategoryBelongsToRestaurant(restaurantId, dto.categoryId);
    return MenuRepository.updateDish(restaurantId, dishId, dto);
  }

  static async toggleDishAvailability(
    restaurantId: string,
    dishId: string,
    isAvailable: boolean
  ): Promise<AdminDish> {
    return MenuRepository.setDishAvailability(restaurantId, dishId, isAvailable);
  }

  static async deleteDish(restaurantId: string, dishId: string): Promise<void> {
    await MenuRepository.deleteDish(restaurantId, dishId);
  }

  static async getArAsset(restaurantId: string, dishId: string): Promise<DishARAsset | null> {
    await this.getDish(restaurantId, dishId);
    return MenuRepository.getArAssetByDishId(restaurantId, dishId);
  }

  static async upsertArAsset(
    restaurantId: string,
    dishId: string,
    dto: UpsertArAssetDTO
  ): Promise<DishARAsset> {
    await this.getDish(restaurantId, dishId);

    const publish = dto.isPublished ?? false;
    if (publish) {
      const angles = [
        dto.angleFront,
        dto.angleBack,
        dto.angleLeft,
        dto.angleRight,
        dto.angleTop,
      ];
      if (angles.some((a) => !a)) {
        throw new ValidationError("All five AR angles are required to publish", {
          isPublished: ["Upload front, back, left, right, and top angles"],
        });
      }
    }

    const asset = await MenuRepository.upsertArAsset(restaurantId, dishId, dto);
    await MenuRepository.setDishArEnabled(restaurantId, dishId, publish);
    return asset;
  }

  static calculateComboSavings(
    dishIds: string[],
    dishes: Array<{ id: string; price: number }>,
    comboPrice: number
  ): { originalPrice: number; savingsAmount: number } {
    const dishMap = new Map(dishes.map((d) => [d.id, d.price]));
    let original = 0;

    for (const id of dishIds) {
      const price = dishMap.get(id);
      if (price === undefined) {
        throw new ValidationError("One or more combo dishes were not found", {
          dishIds: [`Unknown dish: ${id}`],
        });
      }
      original += price;
    }

    if (comboPrice >= original) {
      throw new ValidationError("Combo price must be less than the sum of dish prices", {
        comboPrice: ["Combo must offer savings"],
      });
    }

    return { originalPrice: original, savingsAmount: original - comboPrice };
  }

  static async listCombos(restaurantId: string): Promise<ComboListPayload> {
    const [combos, dishes] = await Promise.all([
      MenuRepository.listCombos(restaurantId),
      MenuRepository.listDishes(restaurantId, { availableOnly: true }),
    ]);
    return { combos, dishes: dishes as CustomerDish[] };
  }

  static async createCombo(restaurantId: string, dto: CreateComboDTO): Promise<Combo> {
    const dishes = await MenuRepository.findDishesByIds(restaurantId, dto.dishIds);
    const { savingsAmount } = this.calculateComboSavings(dto.dishIds, dishes, dto.comboPrice);
    return MenuRepository.createCombo(restaurantId, { ...dto, savingsAmount });
  }

  static async updateCombo(
    restaurantId: string,
    comboId: string,
    dto: UpdateComboDTO
  ): Promise<Combo> {
    let savingsAmount: number | undefined;

    if (dto.dishIds !== undefined && dto.comboPrice !== undefined) {
      const dishes = await MenuRepository.findDishesByIds(restaurantId, dto.dishIds);
      savingsAmount = this.calculateComboSavings(dto.dishIds, dishes, dto.comboPrice).savingsAmount;
    } else if (dto.dishIds !== undefined) {
      const combo = await MenuRepository.findComboById(restaurantId, comboId);
      if (combo) {
        const dishes = await MenuRepository.findDishesByIds(restaurantId, dto.dishIds);
        savingsAmount = this.calculateComboSavings(
          dto.dishIds,
          dishes,
          combo.combo_price
        ).savingsAmount;
      }
    } else if (dto.comboPrice !== undefined) {
      const combo = await MenuRepository.findComboById(restaurantId, comboId);
      if (combo) {
        const dishes = await MenuRepository.findDishesByIds(restaurantId, combo.dish_ids);
        savingsAmount = this.calculateComboSavings(
          combo.dish_ids,
          dishes,
          dto.comboPrice
        ).savingsAmount;
      }
    }

    return MenuRepository.updateCombo(restaurantId, comboId, { ...dto, savingsAmount });
  }

  static async toggleCombo(
    restaurantId: string,
    comboId: string,
    isActive: boolean
  ): Promise<Combo> {
    return MenuRepository.updateCombo(restaurantId, comboId, { isActive });
  }

  static async deleteCombo(restaurantId: string, comboId: string): Promise<void> {
    await MenuRepository.deleteCombo(restaurantId, comboId);
  }

  private static async assertCategoryBelongsToRestaurant(
    restaurantId: string,
    categoryId: string
  ): Promise<void> {
    const categories = await MenuRepository.listCategories(restaurantId);
    if (!categories.some((category) => category.id === categoryId)) {
      throw new ValidationError("Category does not belong to this restaurant", {
        categoryId: ["Invalid category"],
      });
    }
  }
}
