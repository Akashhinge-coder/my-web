import { NextRequest } from "next/server";
import { getAnalyticsDashboard } from "@/backend/controllers/analytics.controller";

export async function GET(req: NextRequest) {
  return getAnalyticsDashboard(req);
}
