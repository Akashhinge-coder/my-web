import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { PlatformRepository } from "@/backend/repositories/platform.repository";
import { AuditService } from "./audit.service";
import { verifyReauthToken } from "@/backend/utils/reauth";
import type { UpdateRestaurantActivationDTO } from "@/backend/validations/platform.schema";
import type { PlatformDashboard, PlatformStats } from "@/types/platform";

export class PlatformService {
  /**
   * Asserts that the current request comes from a verified superadmin.
   *
   * SECURITY: Only app_metadata.role is trusted for the JWT fast-path.
   * app_metadata is ADMIN-CONTROLLED (set only via Supabase service-role or
   * Supabase dashboard). user_metadata is USER-EDITABLE and MUST NEVER be
   * used for privilege decisions.
   *
   * Fallback: staff table lookup via admin client (bypasses RLS) for users
   * who have a staff row with role='superadmin' but no JWT claim.
   */
  static async assertSuperadminAccess(): Promise<{ userId: string }> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

    // Enforce max session age (8 hours) from last_sign_in_at
    if (user.last_sign_in_at) {
      const lastSignInTime = new Date(user.last_sign_in_at).getTime();
      const sessionAgeMs = Date.now() - lastSignInTime;
      if (sessionAgeMs > 8 * 60 * 60 * 1000) {
        throw new AuthError("Session expired (8 hour limit). Please log in again.", 401, "SESSION_EXPIRED");
      }
    }

    // SECURITY: Only trust app_metadata — it is set exclusively by admin operations
    // and cannot be modified by the user via the Supabase client SDK.
    // NEVER check user_metadata here — it is user-editable.
    const appRole = user.app_metadata?.role;
    if (appRole === "superadmin") return { userId: user.id };

    // Fallback: staff table with role='superadmin' (DB-enforced enum,
    // protected by owner_insert_staff RLS policy + schema validation).
    const hasStaffRole = await PlatformRepository.userHasSuperadminAccess(user.id);
    if (!hasStaffRole) {
      throw new AuthError("Superadmin access required", 403, "FORBIDDEN");
    }

    return { userId: user.id };
  }

  static async getDashboard(): Promise<PlatformDashboard> {
    const { userId } = await this.assertSuperadminAccess();

    const [restaurants, payments, orders] = await Promise.all([
      PlatformRepository.listRestaurants(),
      PlatformRepository.listPaymentMetrics(),
      PlatformRepository.listOrderMetrics(),
    ]);

    const stats: PlatformStats = {
      total: restaurants.length,
      active: restaurants.filter((restaurant) => restaurant.is_active).length,
      orders: orders.length,
      revenue: payments.reduce(
        (sum, payment) => sum + Number(payment.amount_paid ?? 0),
        0
      ),
    };

    // Persist audit event — fire-and-forget (non-blocking)
    void AuditService.log({
      actorUserId: userId,
      action: "VIEW_PLATFORM_DASHBOARD",
      targetType: "platform",
      targetId: null,
      metadata: { restaurantCount: stats.total },
    });

    return { restaurants, stats };
  }

  static async updateRestaurantActivation(
    dto: UpdateRestaurantActivationDTO,
    actorUserId?: string,
    reauthToken?: string | null,
    auditCtx?: { ipAddress?: string; userAgent?: string; requestId?: string }
  ) {
    const { userId } = await this.assertSuperadminAccess();
    const actor = actorUserId ?? userId;

    // Enforce step-up re-authentication
    const reauthValid = verifyReauthToken(reauthToken, actor);
    if (!reauthValid) {
      throw new AuthError("Step-up re-authentication required", 401, "REAUTH_REQUIRED");
    }

    // Cascade deactivation: expire all active customer sessions for the restaurant
    // so no in-flight orders or payments can proceed after deactivation.
    if (!dto.isActive) {
      await PlatformRepository.expireActiveSessionsForRestaurant(dto.restaurantId);
    }

    const updated = await PlatformRepository.setRestaurantActive(dto.restaurantId, dto.isActive);

    // Audit log — immutable record of who changed what and when
    void AuditService.log({
      actorUserId: actor,
      action: dto.isActive ? "ACTIVATE_RESTAURANT" : "DEACTIVATE_RESTAURANT",
      targetType: "restaurant",
      targetId: dto.restaurantId,
      metadata: { isActive: dto.isActive, actorRole: "superadmin" },
      ipAddress: auditCtx?.ipAddress,
    });


    return updated;
  }
}

