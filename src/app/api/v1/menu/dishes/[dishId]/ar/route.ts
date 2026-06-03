import { NextRequest } from "next/server";
import { getDishAr, upsertDishAr } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function GET(
  req: NextRequest,
  { params }: { params: { dishId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return getDishAr(restaurantId, params.dishId);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { dishId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return upsertDishAr(req, restaurantId, params.dishId);
}
