import { createClient } from "@/config/supabase/server";
import { AuthError } from "@/backend/errors/AuthError";
import { requireRole } from "@/backend/middleware/rbac.middleware";
import { BillingRepository } from "@/backend/repositories/billing.repository";
import type { UserRole } from "@/types/domain";

const OPERATIONS_ROLES: UserRole[] = ["admin", "manager"];

export interface RestaurantAccess {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantPhone: string | null;
  role: UserRole;
}

/**
 * Resolves the authenticated user's restaurant context from their session.
 * NEVER trusts client-supplied restaurant IDs.
 * NEVER uses the service-role / admin client.
 * Throws AuthError if the user is not authenticated or has no restaurant access.
 */
export async function resolveRestaurantAccess(): Promise<RestaurantAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");

  const owned = await BillingRepository.getOwnedRestaurantForUser(user.id);
  if (owned) {
    return {
      restaurantId: owned.id,
      restaurantName: owned.name,
      restaurantSlug: owned.slug,
      restaurantPhone: owned.phone,
      role: "admin",
    };
  }

  const staff = await BillingRepository.getStaffAccessForUser(user.id);
  if (!staff) {
    throw new AuthError("Restaurant access required", 403, "FORBIDDEN");
  }

  requireRole(staff.role, OPERATIONS_ROLES);
  return {
    restaurantId: staff.restaurant.id,
    restaurantName: staff.restaurant.name,
    restaurantSlug: staff.restaurant.slug,
    restaurantPhone: staff.restaurant.phone,
    role: staff.role,
  };
}
