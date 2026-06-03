import { NextRequest } from "next/server";
import { deleteCoupon, updateCoupon } from "@/backend/controllers/coupon.controller";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateCoupon(req, params.id);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return deleteCoupon(params.id);
}
