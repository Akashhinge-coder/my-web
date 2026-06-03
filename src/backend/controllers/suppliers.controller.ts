import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { SuppliersService } from "@/backend/services/suppliers.service";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/backend/validations/suppliers.validation";
import { created, noContent, ok } from "@/backend/utils/apiResponse";

export async function listSuppliers() {
  try {
    return ok(await SuppliersService.list());
  } catch (error) {
    return handleError(error);
  }
}

export async function createSupplier(req: NextRequest) {
  try {
    const dto = validate(createSupplierSchema, await req.json());
    return created(await SuppliersService.create(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSupplier(req: NextRequest, supplierId: string) {
  try {
    const dto = validate(updateSupplierSchema, await req.json());
    return ok(await SuppliersService.update(supplierId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteSupplier(supplierId: string) {
  try {
    await SuppliersService.delete(supplierId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
