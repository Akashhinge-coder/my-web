import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { TableService } from "@/backend/services/table.service";
import {
  createTableSchema,
  updateTableStatusSchema,
} from "@/backend/validations/table.validation";
import { created, noContent, ok } from "@/backend/utils/apiResponse";

export async function getTablesPage() {
  try {
    return ok(await TableService.getPageData());
  } catch (error) {
    return handleError(error);
  }
}

export async function createTable(req: NextRequest) {
  try {
    const dto = validate(createTableSchema, await req.json());
    return created(await TableService.create(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateTable(req: NextRequest, tableId: string) {
  try {
    const dto = validate(updateTableStatusSchema, await req.json());
    return ok(await TableService.updateStatus(tableId, dto.status));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteTable(tableId: string) {
  try {
    await TableService.delete(tableId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
