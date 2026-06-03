import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import {
  mapLoyaltyAccount,
  mapLoyaltyPricingInput,
  type LoyaltyAccountDTO,
} from "@/backend/mappers/loyalty.mapper";
import { LoyaltyRepository } from "@/backend/repositories/loyalty.repository";
import { applyLoyaltyRedemption } from "@/backend/services/pricing.service";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { LoyaltyRedeemDTO } from "@/backend/validations/loyalty.validation";

export interface LoyaltyProgramSettings {
  pointsPerHundred: number;
  minimumPointsToRedeem: number;
  redemptionRate: number;
  maxRedemptionPercent: number;
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
  accounts: LoyaltyAccountDTO[];
}

export interface LoyaltyRedemptionQuote {
  account: LoyaltyAccountDTO;
  requestedPoints: number;
  redeemablePoints: number;
  discount: number;
  remainingPoints: number;
  settings: LoyaltyProgramSettings;
}

const DEFAULT_SETTINGS: LoyaltyProgramSettings = {
  pointsPerHundred: 10,
  minimumPointsToRedeem: 100,
  redemptionRate: 0.1,
  maxRedemptionPercent: 20,
};

function calculateRedeemedPoints(params: {
  discount: number;
  pointsRequested: number;
  pointsBalance: number;
  redemptionRate: number;
}): number {
  if (params.discount <= 0 || params.redemptionRate <= 0) return 0;

  const maxPointsByDiscount = Math.floor(params.discount / params.redemptionRate);
  return Math.max(
    0,
    Math.min(params.pointsRequested, params.pointsBalance, maxPointsByDiscount)
  );
}

export class LoyaltyService {
  static pointsForSpend(amount: number, settings: LoyaltyProgramSettings = DEFAULT_SETTINGS): number {
    return Math.floor(amount / 100) * settings.pointsPerHundred;
  }

  static getSettings(): LoyaltyProgramSettings {
    return DEFAULT_SETTINGS;
  }

  static async getDashboard(): Promise<LoyaltyDashboard> {
    const accounts = await this.listAccounts();
    return {
      settings: DEFAULT_SETTINGS,
      summary: this.calculateSummary(accounts),
      accounts,
    };
  }

  static async listAccounts(): Promise<LoyaltyAccountDTO[]> {
    const access = await resolveRestaurantAccess();
    const rows = await LoyaltyRepository.listAccounts(access.restaurantId);
    return rows.map(mapLoyaltyAccount);
  }

  static async redeem(dto: LoyaltyRedeemDTO): Promise<LoyaltyRedemptionQuote> {
    const access = await resolveRestaurantAccess();
    const row = await LoyaltyRepository.findAccountByPhone(access.restaurantId, dto.phone);
    if (!row) throw new NotFoundError("Loyalty account not found");

    const account = mapLoyaltyAccount(row);
    if (dto.pointsToRedeem < DEFAULT_SETTINGS.minimumPointsToRedeem) {
      throw new ValidationError("Minimum points to redeem not met", {
        pointsToRedeem: [`Minimum ${DEFAULT_SETTINGS.minimumPointsToRedeem} points required`],
      });
    }

    const discount = applyLoyaltyRedemption(
      dto.orderAmount,
      mapLoyaltyPricingInput({
        account,
        pointsToRedeem: dto.pointsToRedeem,
        settings: DEFAULT_SETTINGS,
      })
    );
    const redeemablePoints = calculateRedeemedPoints({
      discount,
      pointsRequested: dto.pointsToRedeem,
      pointsBalance: account.totalPoints,
      redemptionRate: DEFAULT_SETTINGS.redemptionRate,
    });

    const remainingPoints = account.totalPoints - redeemablePoints;
    const updatedAccount = dto.commit
      ? mapLoyaltyAccount(await LoyaltyRepository.updatePoints(access.restaurantId, account.id, remainingPoints))
      : account;

    return {
      account: updatedAccount,
      requestedPoints: dto.pointsToRedeem,
      redeemablePoints,
      discount,
      remainingPoints: updatedAccount.totalPoints,
      settings: DEFAULT_SETTINGS,
    };
  }

  private static calculateSummary(accounts: LoyaltyAccountDTO[]): LoyaltySummary {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      totalMembers: accounts.length,
      activeMembers: accounts.filter((account) => {
        return Boolean(account.lastVisited && new Date(account.lastVisited).getTime() >= thirtyDaysAgo);
      }).length,
      totalPoints: accounts.reduce((sum, account) => sum + account.totalPoints, 0),
      totalSpent: accounts.reduce((sum, account) => sum + account.totalSpent, 0),
    };
  }
}
