import { AuthError } from "@/backend/errors/AuthError";

export function requireTenant(restaurantId: string | null | undefined) {
  if (!restaurantId) {
    throw new AuthError("Restaurant context is required", 403, "TENANT_REQUIRED");
  }
  return restaurantId;
}
