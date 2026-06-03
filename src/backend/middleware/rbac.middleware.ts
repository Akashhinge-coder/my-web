import { AuthError } from "@/backend/errors/AuthError";
import type { UserRole } from "@/types/domain";

export function requireRole(currentRole: UserRole, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(currentRole)) {
    throw new AuthError("Insufficient permissions", 403, "FORBIDDEN");
  }
}
