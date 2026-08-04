import { updateLoyaltySettings } from "@/backend/controllers/loyalty.controller";

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  return updateLoyaltySettings(req as any);
}
