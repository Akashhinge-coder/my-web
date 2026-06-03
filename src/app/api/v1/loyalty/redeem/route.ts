import { NextRequest } from "next/server";
import { redeemLoyaltyPoints } from "@/backend/controllers/loyalty.controller";

export async function POST(req: NextRequest) {
  return redeemLoyaltyPoints(req);
}
