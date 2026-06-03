import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { WaitlistService } from "@/backend/services/waitlist.service";
import {
  createWaitlistSchema,
  updateWaitlistStatusSchema,
} from "@/backend/validations/waitlist.validation";
import { created, ok } from "@/backend/utils/apiResponse";

export async function getWaitlistPage() {
  try {
    return ok(await WaitlistService.getPageData());
  } catch (error) {
    return handleError(error);
  }
}

export async function addWaitlistGuest(req: NextRequest) {
  try {
    const dto = validate(createWaitlistSchema, await req.json());
    return created(await WaitlistService.addGuest(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateWaitlistEntry(req: NextRequest, entryId: string) {
  try {
    const dto = validate(updateWaitlistStatusSchema, await req.json());
    return ok(await WaitlistService.updateStatus(entryId, dto));
  } catch (error) {
    return handleError(error);
  }
}
