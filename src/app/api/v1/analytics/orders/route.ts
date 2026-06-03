import { NextRequest } from "next/server";
import { getAnalyticsOrders } from "@/backend/controllers/analytics.controller";

export async function GET(req: NextRequest) {
  return getAnalyticsOrders(req);
}
