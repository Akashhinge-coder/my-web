import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { RestaurantService } from "@/backend/services/restaurant.service";
import { ok } from "@/backend/utils/apiResponse";

export async function getRestaurant(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    const id = req.nextUrl.searchParams.get("id");

    if (id) return ok(await RestaurantService.getById(id));
    if (!slug) return ok(null, { status: 422 });
    return ok(await RestaurantService.getBySlug(slug));
  } catch (error) {
    return handleError(error);
  }
}
