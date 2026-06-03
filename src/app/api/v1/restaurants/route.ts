import { NextRequest } from "next/server";
import { getRestaurant } from "@/backend/controllers/restaurant.controller";

export async function GET(req: NextRequest) {
  return getRestaurant(req);
}
