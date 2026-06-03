import { NextRequest } from "next/server";
import { getIntegrationsStats } from "@/backend/controllers/integrations.controller";

export async function GET(req: NextRequest) {
  return getIntegrationsStats(req);
}
