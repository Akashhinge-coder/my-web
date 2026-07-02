import { listLoyaltyAccounts } from "@/backend/controllers/loyalty.controller";

export const dynamic = 'force-dynamic';
export async function GET() {
  return listLoyaltyAccounts();
}
