import { NextRequest } from "next/server";
import { getIntegrationsDashboard } from "@/backend/controllers/integrations.controller";

export async function GET(req: NextRequest) {
  return getIntegrationsDashboard(req);
}
