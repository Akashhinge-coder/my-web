import { NextRequest } from "next/server";
import { deleteDish, getDish, updateDish } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function GET(
  req: NextRequest,
  { params }: { params: { dishId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return getDish(req, restaurantId, params.dishId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dishId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return updateDish(req, restaurantId, params.dishId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { dishId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return deleteDish(restaurantId, params.dishId);
}
