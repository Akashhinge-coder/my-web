import { ok } from "@/backend/utils/apiResponse";
import { handleError } from "@/backend/errors/handler";
import { AuthService } from "@/backend/services/auth.service";

export async function authHealth() {
  return ok({ authenticated: true });
}

export async function getAuthSession() {
  try {
    return ok(await AuthService.resolveAdminSession());
  } catch (error) {
    return handleError(error);
  }
}
