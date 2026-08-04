import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ValidationError } from "@/backend/errors/ValidationError";
import {
  mapLoyaltyAccount,
  mapLoyaltyPricingInput,
  type LoyaltyAccountDTO,
} from "@/backend/mappers/loyalty.mapper";
import { LoyaltyRepository } from "@/backend/repositories/loyalty.repository";
import { OrderRepository } from "@/backend/repositories/order.repository";
import { BillingService } from "@/backend/services/billing.service";
import { applyLoyaltyRedemption } from "@/backend/services/pricing.service";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import type { LoyaltyRedeemDTO } from "@/backend/validations/loyalty.validation";

export interface LoyaltyProgramSettings {
  earnEnabled: boolean;
  redeemEnabled: boolean;
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
  earnEnabled: true,
  redeemEnabled: true,
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

  static async getSettings(restaurantId: string): Promise<LoyaltyProgramSettings> {
    const row = await LoyaltyRepository.getSettings(restaurantId);
    if (!row) return DEFAULT_SETTINGS;
    
    return {
      earnEnabled: Boolean(row.earn_enabled),
      redeemEnabled: Boolean(row.redeem_enabled),
      pointsPerHundred: Number(row.base_points_per_hundred),
      minimumPointsToRedeem: Number(row.minimum_points_to_redeem),
      redemptionRate: Number(row.redemption_rate),
      maxRedemptionPercent: Number(row.max_redemption_percent),
    };
  }

  static async getDashboard(): Promise<LoyaltyDashboard> {
    const access = await resolveRestaurantAccess();
    const [accounts, settings] = await Promise.all([
      this.listAccounts(),
      this.getSettings(access.restaurantId)
    ]);
    
    return {
      settings,
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
    const settings = await this.getSettings(access.restaurantId);

    if (!settings.redeemEnabled) {
      throw new ValidationError("Loyalty redemption is currently disabled", {
        pointsToRedeem: ["Program disabled"],
      });
    }

    if (dto.pointsToRedeem < settings.minimumPointsToRedeem) {
      throw new ValidationError("Minimum points to redeem not met", {
        pointsToRedeem: [`Minimum ${settings.minimumPointsToRedeem} points required`],
      });
    }

    if (dto.pointsToRedeem > account.availablePoints) {
      throw new ValidationError("Insufficient points balance", {
        pointsToRedeem: [`Insufficient points balance (available: ${account.availablePoints})`],
      });
    }

    // Resolve bill amount from database active session orders
    const orders = await OrderRepository.listForBill(dto.sessionId);
    const bill = BillingService.calculateSessionBill({ orders });
    
    // The base amount for loyalty discount calculation is subtotal minus happy hour and coupon discounts
    const baseAmount = Math.max(0, bill.subtotal - bill.happyHourDiscount - bill.couponDiscount);

    // Enforce 20% cap (or default setting's maxRedemptionPercent)
    const maxDiscount = (baseAmount * settings.maxRedemptionPercent) / 100;
    const requestedDiscount = dto.pointsToRedeem * settings.redemptionRate;

    if (requestedDiscount > maxDiscount) {
      throw new ValidationError(`Redemption discount exceeds the ${settings.maxRedemptionPercent}% limit of the bill`, {
        pointsToRedeem: [`Cannot redeem points yielding more than a ${settings.maxRedemptionPercent}% discount (max discount: Rs. ${maxDiscount})`],
      });
    }

    const discount = applyLoyaltyRedemption(
      baseAmount,
      mapLoyaltyPricingInput({
        account,
        pointsToRedeem: dto.pointsToRedeem,
        settings,
      })
    );
    const redeemablePoints = calculateRedeemedPoints({
      discount,
      pointsRequested: dto.pointsToRedeem,
      pointsBalance: account.availablePoints,
      redemptionRate: settings.redemptionRate,
    });

    let updatedAccount = account;
    if (dto.commit) {
      const dbRow = await LoyaltyRepository.redeemPointsAtomic(access.restaurantId, account.id, redeemablePoints);
      if (!dbRow) {
        throw new ValidationError("Insufficient points balance (concurrent transaction rejected)", {
          pointsToRedeem: [`Insufficient points balance at the time of commit. Please refresh and try again.`],
        });
      }
      updatedAccount = mapLoyaltyAccount(dbRow);
    }

    return {
      account: updatedAccount,
      requestedPoints: dto.pointsToRedeem,
      redeemablePoints,
      discount,
      remainingPoints: updatedAccount.availablePoints,
      settings,
    };
  }

  static async listTransactions(query?: { accountId?: string; limit?: number; offset?: number }): Promise<any[]> {
    const access = await resolveRestaurantAccess();
    return LoyaltyRepository.listTransactions(access.restaurantId, query);
  }

  static async updateSettings(updates: Partial<LoyaltyProgramSettings>): Promise<LoyaltyProgramSettings> {
    const access = await resolveRestaurantAccess();
    
    const dbUpdates: any = {};
    if (updates.earnEnabled !== undefined) dbUpdates.earn_enabled = updates.earnEnabled;
    if (updates.redeemEnabled !== undefined) dbUpdates.redeem_enabled = updates.redeemEnabled;
    if (updates.pointsPerHundred !== undefined) dbUpdates.base_points_per_hundred = updates.pointsPerHundred;
    if (updates.minimumPointsToRedeem !== undefined) dbUpdates.minimum_points_to_redeem = updates.minimumPointsToRedeem;
    if (updates.redemptionRate !== undefined) dbUpdates.redemption_rate = updates.redemptionRate;
    if (updates.maxRedemptionPercent !== undefined) dbUpdates.max_redemption_percent = updates.maxRedemptionPercent;

    if (Object.keys(dbUpdates).length > 0) {
      await LoyaltyRepository.updateSettings(access.restaurantId, dbUpdates);
    }
    
    return this.getSettings(access.restaurantId);
  }

  private static calculateSummary(accounts: LoyaltyAccountDTO[]): LoyaltySummary {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return {
      totalMembers: accounts.length,
      activeMembers: accounts.filter((account) => {
        return Boolean(account.lastVisited && new Date(account.lastVisited).getTime() >= thirtyDaysAgo);
      }).length,
      totalPoints: accounts.reduce((sum, account) => sum + account.availablePoints, 0),
      totalSpent: accounts.reduce((sum, account) => sum + account.totalSpent, 0),
    };
  }
}
