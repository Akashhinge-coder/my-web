import { NextRequest } from "next/server";
import { getRestaurant } from "@/backend/controllers/restaurant.controller";

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return getRestaurant(req);
}
