import { NotFoundError } from "@/backend/errors/NotFoundError";
import { SuppliersRepository } from "@/backend/repositories/suppliers.repository";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { CreateSupplierDTO, UpdateSupplierDTO } from "@/backend/validations/suppliers.validation";
import type { Supplier } from "@/types/domain";

export class SuppliersService {
  static async list(): Promise<Supplier[]> {
    const access = await resolveRestaurantAccess();
    return SuppliersRepository.listByRestaurant(access.restaurantId);
  }

  static async create(dto: CreateSupplierDTO): Promise<Supplier> {
    const access = await resolveRestaurantAccess();
    return SuppliersRepository.create(access.restaurantId, dto);
  }

  static async update(supplierId: string, dto: UpdateSupplierDTO): Promise<Supplier> {
    const access = await resolveRestaurantAccess();
    const existing = await SuppliersRepository.findById(access.restaurantId, supplierId);
    if (!existing) throw new NotFoundError("Supplier not found");
    return SuppliersRepository.update(access.restaurantId, supplierId, dto);
  }

  static async delete(supplierId: string): Promise<void> {
    const access = await resolveRestaurantAccess();
    const existing = await SuppliersRepository.findById(access.restaurantId, supplierId);
    if (!existing) throw new NotFoundError("Supplier not found");
    await SuppliersRepository.delete(access.restaurantId, supplierId);
  }
}
