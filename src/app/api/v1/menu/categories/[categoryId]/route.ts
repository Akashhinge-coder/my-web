import { NextRequest } from "next/server";
import { deleteCategory, updateCategory } from "@/backend/controllers/menu.controller";
import { fail } from "@/backend/utils/apiResponse";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return updateCategory(req, restaurantId, params.categoryId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return fail("VALIDATION_ERROR", "restaurantId is required", 422);
  }
  return deleteCategory(restaurantId, params.categoryId);
}
