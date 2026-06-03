import { NextRequest } from "next/server";
import { createCategory, listCategories } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function GET(req: NextRequest) {
  return listCategories(req);
}

export async function POST(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return createCategory(req, restaurantId);
}
