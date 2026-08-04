import { apiFetch } from "@/frontend/api/http";

export interface LoyaltyProgramSettings {
  earnEnabled: boolean;
  redeemEnabled: boolean;
  pointsPerHundred: number;
  minimumPointsToRedeem: number;
  redemptionRate: number;
  maxRedemptionPercent: number;
}

export interface LoyaltyAccount {
  id: string;
  phone: string;
  name: string | null;
  totalPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisited: string | null;
}

export interface LoyaltySummary {
  totalMembers: number;
  activeMembers: number;
  totalPoints: number;
  totalSpent: number;
}

export interface LoyaltyDashboard {
  settings: LoyaltyProgramSettings;
  summary: LoyaltySummary;
  accounts: LoyaltyAccount[];
}

export interface LoyaltyRedeemPayload {
  phone: string;
  orderAmount: number;
  pointsToRedeem: number;
  commit?: boolean;
}

export interface LoyaltyRedemptionQuote {
  account: LoyaltyAccount;
  requestedPoints: number;
  redeemablePoints: number;
  discount: number;
  remainingPoints: number;
  settings: LoyaltyProgramSettings;
}

export const loyaltyApi = {
  dashboard() {
    return apiFetch<LoyaltyDashboard>("/api/v1/loyalty");
  },

  accounts() {
    return apiFetch<LoyaltyAccount[]>("/api/v1/loyalty/accounts");
  },

  redeem(payload: LoyaltyRedeemPayload) {
    return apiFetch<LoyaltyRedemptionQuote>("/api/v1/loyalty/redeem", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateSettings(payload: Partial<LoyaltyProgramSettings>) {
    return apiFetch<LoyaltyProgramSettings>("/api/v1/loyalty/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
