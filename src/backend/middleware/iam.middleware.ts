import { AuthError } from "@/backend/errors/AuthError";
import { IAMService } from "@/backend/services/iam.service";
import { resolveRestaurantAccess, RestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import { createClient } from "@/config/supabase/server";

/**
 * Enforces IAM permissions for the current user.
 * Returns the restaurant access context if successful, throws AuthError otherwise.
 */
export async function requirePermission(permissionId: string): Promise<RestaurantAccess> {
  const access = await resolveRestaurantAccess();

  // Owners (resolved with role 'admin' by getOwnedRestaurantForUser) have implicit full access in this simplified model
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

  const owned = await BillingRepository.getOwnedRestaurantForUser(user.id);
  if (owned) {
    return access; // Is owner
  }

  const staff = await BillingRepository.getStaffAccessForUser(user.id);
  if (!staff) throw new AuthError("Staff access required", 403, "FORBIDDEN");

  // Check IAM Service
  const hasPermission = await IAMService.can(staff as any, permissionId);
  if (!hasPermission) {
    throw new AuthError(`Missing required permission: ${permissionId}`, 403, "FORBIDDEN");
  }

  return access;
}
