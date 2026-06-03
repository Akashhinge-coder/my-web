import { NextRequest } from "next/server";
import { getAnalyticsCustomers } from "@/backend/controllers/analytics.controller";

export async function GET(req: NextRequest) {
  return getAnalyticsCustomers(req);
}
