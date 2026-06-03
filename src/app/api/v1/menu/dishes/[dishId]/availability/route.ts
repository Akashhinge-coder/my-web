import { NextRequest } from "next/server";
import { toggleDishAvailability } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { dishId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return toggleDishAvailability(req, restaurantId, params.dishId);
}
