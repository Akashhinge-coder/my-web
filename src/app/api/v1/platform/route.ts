import { NextRequest } from "next/server";
import {
  getPlatformDashboard,
  updateRestaurantActivation,
} from "@/backend/controllers/platform.controller";

export async function GET() {
  return getPlatformDashboard();
}

export async function PATCH(req: NextRequest) {
  return updateRestaurantActivation(req);
}

