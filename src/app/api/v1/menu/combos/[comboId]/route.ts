import { NextRequest } from "next/server";
import { deleteCombo, updateCombo } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { comboId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return updateCombo(req, restaurantId, params.comboId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { comboId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return deleteCombo(restaurantId, params.comboId);
}
