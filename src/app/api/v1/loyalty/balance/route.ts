import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { ok, fail } from "@/backend/utils/apiResponse";
import { LoyaltyRepository } from "@/backend/repositories/loyalty.repository";
import { RestaurantRepository } from "@/backend/repositories/restaurant.repository";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    const slug = req.nextUrl.searchParams.get("slug");
    
    if (!phone || !slug) {
      return fail("VALIDATION_ERROR", "Phone and slug are required", 400);
    }
    
    const restaurant = await RestaurantRepository.getBySlug(slug);
    if (!restaurant) {
      return fail("NOT_FOUND", "Restaurant not found", 404);
    }

    const account = await LoyaltyRepository.findAccountByPhone(restaurant.id, phone);
    if (!account) {
      return ok({ availablePoints: 0, exists: false });
    }

    return ok({ availablePoints: account.available_points, exists: true });
  } catch (error) {
    return handleError(error);
  }
}
