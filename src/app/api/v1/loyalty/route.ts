import { getLoyaltyDashboard } from "@/backend/controllers/loyalty.controller";

export const dynamic = 'force-dynamic';
export async function GET() {
  return getLoyaltyDashboard();
}
