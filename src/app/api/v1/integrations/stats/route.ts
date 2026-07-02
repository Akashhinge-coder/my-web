import { NextRequest } from "next/server";
import { getIntegrationsStats } from "@/backend/controllers/integrations.controller";

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return getIntegrationsStats(req);
}
