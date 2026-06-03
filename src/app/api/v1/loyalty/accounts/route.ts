import { listLoyaltyAccounts } from "@/backend/controllers/loyalty.controller";

export async function GET() {
  return listLoyaltyAccounts();
}
