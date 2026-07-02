import { NextRequest } from "next/server";
import { getAnalyticsSales } from "@/backend/controllers/analytics.controller";

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return getAnalyticsSales(req);
}
