import { NextRequest } from "next/server";
import { getIntegrationsDashboard } from "@/backend/controllers/integrations.controller";

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return getIntegrationsDashboard(req);
}
