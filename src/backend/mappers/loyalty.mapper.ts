import type { LoyaltyDiscount } from "@/types/pricing";
import type { LoyaltyAccountRow } from "@/backend/repositories/loyalty.repository";
import type { LoyaltyProgramSettings } from "@/backend/services/loyalty.service";

export interface LoyaltyAccountDTO {
  id: string;
  phone: string;
  name: string | null;
  totalPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisited: string | null;
}

export function mapLoyaltyAccount(row: LoyaltyAccountRow): LoyaltyAccountDTO {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    totalPoints: Number(row.total_points),
    totalSpent: Number(row.total_spent),
    visitCount: row.visit_count,
    lastVisited: row.last_visited,
  };
}

export function mapLoyaltyPricingInput(params: {
  account: LoyaltyAccountDTO;
  pointsToRedeem: number;
  settings: LoyaltyProgramSettings;
}): LoyaltyDiscount {
  return {
    pointsBalance: params.account.totalPoints,
    pointsToRedeem: params.pointsToRedeem,
    redemptionRate: params.settings.redemptionRate,
    maxRedemptionPercent: params.settings.maxRedemptionPercent,
    minimumPointsToRedeem: params.settings.minimumPointsToRedeem,
  };
}
