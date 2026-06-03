import { AuthError } from "@/backend/errors/AuthError";

export function requireUser<TUser>(user: TUser | null | undefined): TUser {
  if (!user) throw new AuthError("Authentication required", 401, "AUTH_REQUIRED");
  return user;
}
