import { NextRequest } from "next/server";
import {
  createOrder,
  listOrders,
  placeOrder,
  quoteOrderPricing,
} from "@/backend/controllers/order.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function GET(req: NextRequest) {
  return listOrders(req);
}

export async function POST(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }

  const mode = req.nextUrl.searchParams.get("mode");
  if (mode === "pricing") {
    return quoteOrderPricing(req, restaurantId);
  }

  if (mode === "place") {
    return placeOrder(req, restaurantId);
  }

  return createOrder(req, restaurantId);
}
