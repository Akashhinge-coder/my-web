import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { PlatformService } from "@/backend/services/platform.service";
import { AuditService } from "@/backend/services/audit.service";
import { updateRestaurantActivationSchema } from "@/backend/validations/platform.schema";
import { ok } from "@/backend/utils/apiResponse";

export async function getPlatformDashboard() {
  try {
    return ok(await PlatformService.getDashboard());
  } catch (error) {
    return handleError(error);
  }
}

export async function updateRestaurantActivation(req: NextRequest, ipAddress?: string) {
  try {
    const body = await req.json();
    const dto = validate(updateRestaurantActivationSchema, body);

    // Resolve actor from the service (re-verifies superadmin inside)
    const result = await PlatformService.updateRestaurantActivation(dto);

    // Log the IP alongside the audit event — the service already fires the log,
    // but we supplement it with IP if available via a separate log entry.
    if (ipAddress) {
      void AuditService.log({
        actorUserId: "system",          // IP-only trace (actor resolved inside service)
        action: dto.isActive ? "ACTIVATE_RESTAURANT" : "DEACTIVATE_RESTAURANT",
        targetType: "restaurant",
        targetId: dto.restaurantId,
        metadata: { isActive: dto.isActive, ipAddress },
        ipAddress,
      });
    }

    return ok(result);
  } catch (error) {
    return handleError(error);
  }
}
