import { handleError } from "@/backend/errors/handler";
import { RestaurantService } from "@/backend/services/restaurant.service";
import { ok } from "@/backend/utils/apiResponse";

export async function GET() {
  try {
    const restaurant = await RestaurantService.getActiveForCurrentUser();
    return ok(restaurant);
  } catch (error) {
    return handleError(error);
  }
}
