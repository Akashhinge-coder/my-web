import { getLoyaltyDashboard } from "@/backend/controllers/loyalty.controller";

export async function GET() {
  return getLoyaltyDashboard();
}
