import { NextRequest } from "next/server";
import { createCoupon, listCoupons } from "@/backend/controllers/coupon.controller";

export async function GET() {
  return listCoupons();
}

export async function POST(req: NextRequest) {
  return createCoupon(req);
}
