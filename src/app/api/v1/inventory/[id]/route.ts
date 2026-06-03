import { NextRequest } from "next/server";
import {
  deleteInventoryItem,
  updateInventoryItem,
} from "@/backend/controllers/inventory.controller";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateInventoryItem(req, params.id);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return deleteInventoryItem(params.id);
}
