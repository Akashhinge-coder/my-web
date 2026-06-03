import { NextRequest } from "next/server";
import { updateOrderStatus } from "@/backend/controllers/order.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }

  return updateOrderStatus(req, restaurantId, params.orderId);
}
