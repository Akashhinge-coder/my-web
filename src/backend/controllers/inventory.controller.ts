import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { InventoryService } from "@/backend/services/inventory.service";
import {
  createInventorySchema,
  updateInventorySchema,
} from "@/backend/validations/inventory.validation";
import { created, noContent, ok } from "@/backend/utils/apiResponse";

export async function listInventory() {
  try {
    return ok(await InventoryService.listItems());
  } catch (error) {
    return handleError(error);
  }
}

export async function createInventoryItem(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = validate(createInventorySchema, body);
    return created(await InventoryService.createItem(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateInventoryItem(req: NextRequest, itemId: string) {
  try {
    const body = await req.json();
    const dto = validate(updateInventorySchema, body);
    return ok(await InventoryService.updateItem(itemId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    await InventoryService.deleteItem(itemId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
