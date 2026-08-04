import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { LoyaltyService } from "@/backend/services/loyalty.service";
import { loyaltyRedeemSchema } from "@/backend/validations/loyalty.validation";
import { ok } from "@/backend/utils/apiResponse";

export async function getLoyaltyDashboard() {
  try {
    return ok(await LoyaltyService.getDashboard());
  } catch (error) {
    return handleError(error);
  }
}

export async function listLoyaltyAccounts() {
  try {
    return ok(await LoyaltyService.listAccounts());
  } catch (error) {
    return handleError(error);
  }
}

export async function redeemLoyaltyPoints(req: NextRequest) {
  try {
    const dto = validate(loyaltyRedeemSchema, await req.json());
    return ok(await LoyaltyService.redeem(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateLoyaltySettings(req: NextRequest) {
  try {
    const updates = await req.json();
    return ok(await LoyaltyService.updateSettings(updates));
  } catch (error) {
    return handleError(error);
  }
}
