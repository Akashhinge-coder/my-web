import { NextRequest } from "next/server";
import { validateCoupon } from "@/backend/controllers/coupon.controller";

export async function POST(req: NextRequest) {
  return validateCoupon(req);
}
