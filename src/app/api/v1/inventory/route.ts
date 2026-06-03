import { NextRequest } from "next/server";
import {
  createInventoryItem,
  listInventory,
} from "@/backend/controllers/inventory.controller";

export async function GET() {
  return listInventory();
}

export async function POST(req: NextRequest) {
  return createInventoryItem(req);
}
