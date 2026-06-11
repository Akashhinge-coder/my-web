import { NextRequest } from "next/server";
import {
  createOrder,
  listOrders,
  placeOrder,
  quoteOrderPricing,
} from "@/backend/controllers/order.controller";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import { fail } from "@/backend/utils/apiResponse";

/**
 * GET /api/v1/orders
 * Admin: lists orders for the authenticated user's restaurant.
 * restaurantId comes from the server session — never from the query string.
 */
export async function GET(req: NextRequest) {
  return listOrders(req);
}

/**
 * POST /api/v1/orders
 *
 * Two sources of restaurantId:
 *
 * 1. Customer QR flow (unauthenticated): ?restaurantId=<uuid>&mode=place|pricing
 *    - The customer scanned a QR code that encoded restaurantId + tableId.
 *    - The restaurantId is validated against the tableId in the service layer,
 *      so a spoofed restaurantId cannot access tables it doesn't own.
 *    - Preserved intentionally — customers are not authenticated admins.
 *
 * 2. Admin flow (authenticated): no restaurantId in query — derived from session.
 */
export async function POST(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode");
  const clientRestaurantId = req.nextUrl.searchParams.get("restaurantId");

  // Customer QR ordering flow — restaurantId from URL, validated in service layer
  if (clientRestaurantId && (mode === "pricing" || mode === "place")) {
    if (mode === "pricing") return quoteOrderPricing(req, clientRestaurantId);
    if (mode === "place") return placeOrder(req, clientRestaurantId, { isCustomer: true });
  }

  // Admin order creation — restaurantId must come from session
  try {
    const { restaurantId } = await resolveRestaurantAccess();
    if (mode === "pricing") return quoteOrderPricing(req, restaurantId);
    if (mode === "place") return placeOrder(req, restaurantId);
    return createOrder(req, restaurantId);
  } catch {
    return fail("AUTH_REQUIRED", "Authentication required", 401);
  }
}
