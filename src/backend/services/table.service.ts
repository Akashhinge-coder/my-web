import { generateQRUrl } from "@/lib/utils";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { TableRepository } from "@/backend/repositories/table.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { CreateTableDTO, UpdateTableStatusDTO } from "@/backend/validations/table.validation";
import type { Table, TableStatus } from "@/types/domain";
import type { TablesPageData } from "@/types/tables";

export class TableService {
  static async getPageData(): Promise<TablesPageData> {
    const access = await resolveRestaurantAccess();
    const tables = await TableRepository.listByRestaurant(access.restaurantId);
    return {
      restaurantId: access.restaurantId,
      restaurantSlug: access.restaurantSlug,
      tables,
    };
  }

  static async list(): Promise<Table[]> {
    const access = await resolveRestaurantAccess();
    return TableRepository.listByRestaurant(access.restaurantId);
  }

  static async create(dto: CreateTableDTO): Promise<Table> {
    const access = await resolveRestaurantAccess();
    const id = crypto.randomUUID();
    const qrUrl = generateQRUrl(access.restaurantSlug, id);
    return TableRepository.create(access.restaurantId, dto, qrUrl, id);
  }

  static async updateStatus(tableId: string, status: TableStatus): Promise<Table> {
    const access = await resolveRestaurantAccess();
    const existing = await TableRepository.findByIdForRestaurant(access.restaurantId, tableId);
    if (!existing) throw new NotFoundError("Table not found");
    return TableRepository.updateStatus(access.restaurantId, tableId, { status });
  }

  static async delete(tableId: string): Promise<void> {
    const access = await resolveRestaurantAccess();
    const existing = await TableRepository.findByIdForRestaurant(access.restaurantId, tableId);
    if (!existing) throw new NotFoundError("Table not found");
    await TableRepository.delete(access.restaurantId, tableId);
  }
}
