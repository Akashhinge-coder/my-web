import { createAdminClient } from "@/config/supabase/server";
import { mapSupplierRow, mapSupplierRows, type SupplierRow } from "@/backend/mappers/suppliers.mapper";
import type { CreateSupplierDTO, UpdateSupplierDTO } from "@/backend/validations/suppliers.validation";
import type { Supplier } from "@/types/domain";

export class SuppliersRepository {
  static async listByRestaurant(restaurantId: string): Promise<Supplier[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name");

    if (error) throw error;
    return mapSupplierRows((data ?? []) as SupplierRow[]);
  }

  static async findById(restaurantId: string, supplierId: string): Promise<Supplier | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("id", supplierId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapSupplierRow(data as SupplierRow) : null;
  }

  static async create(restaurantId: string, dto: CreateSupplierDTO): Promise<Supplier> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        restaurant_id: restaurantId,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return mapSupplierRow(data as SupplierRow);
  }

  static async update(
    restaurantId: string,
    supplierId: string,
    dto: UpdateSupplierDTO
  ): Promise<Supplier> {
    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.phone !== undefined) payload.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) payload.email = dto.email?.trim() || null;
    if (dto.address !== undefined) payload.address = dto.address?.trim() || null;
    if (dto.notes !== undefined) payload.notes = dto.notes?.trim() || null;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("restaurant_id", restaurantId)
      .eq("id", supplierId)
      .select("*")
      .single();

    if (error) throw error;
    return mapSupplierRow(data as SupplierRow);
  }

  static async delete(restaurantId: string, supplierId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("id", supplierId);

    if (error) throw error;
  }
}
