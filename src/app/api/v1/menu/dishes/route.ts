import { NextRequest } from "next/server";
import { createDish, listDishes } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function GET(req: NextRequest) {
  return listDishes(req);
}

export async function POST(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return createDish(req, restaurantId);
}
