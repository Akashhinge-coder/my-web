import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { requirePermission } from "@/backend/middleware/iam.middleware";
import { WaitlistService } from "@/backend/services/waitlist.service";
import { GuestQueueAggregate } from "@/backend/services/guest-queue.aggregate";
import {
  createWaitlistSchema,
  updateWaitlistStatusSchema,
} from "@/backend/validations/guest-queue.validation";
import { created, ok } from "@/backend/utils/apiResponse";

// Read views (uses old service for the read model)
export async function getWaitlistPage() {
  try {
    await requirePermission("waitlist.manage");
    return ok(await WaitlistService.getPageData());
  } catch (error) {
    return handleError(error);
  }
}

export async function addWaitlistGuest(req: NextRequest) {
  try {
    const access = await requirePermission("waitlist.manage");
    const dto = validate(createWaitlistSchema, await req.json());
    return created(await GuestQueueAggregate.joinWaitlist(access.restaurantId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateWaitlistEntry(req: NextRequest, entryId: string) {
  try {
    const access = await requirePermission("waitlist.manage");
    const dto = validate(updateWaitlistStatusSchema, await req.json());
    
    // Simplistic transition mapping
    if (dto.status === "notified") {
      return ok(await GuestQueueAggregate.callNextGuest(access.restaurantId, entryId));
    }
    
    // For seated/left, we can just use the old WaitlistRepository update for now since the aggregate doesn't have an explicit method for it yet, 
    // or we just call the old service for those statuses.
    return ok(await WaitlistService.updateStatus(entryId, dto));
  } catch (error) {
    return handleError(error);
  }
}
