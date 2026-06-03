import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { PlatformService } from "@/backend/services/platform.service";
import { updateRestaurantActivationSchema } from "@/backend/validations/platform.schema";
import { ok } from "@/backend/utils/apiResponse";

export async function getPlatformDashboard() {
  try {
    return ok(await PlatformService.getDashboard());
  } catch (error) {
    return handleError(error);
  }
}

export async function updateRestaurantActivation(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = validate(updateRestaurantActivationSchema, body);
    return ok(await PlatformService.updateRestaurantActivation(dto));
  } catch (error) {
    return handleError(error);
  }
}

