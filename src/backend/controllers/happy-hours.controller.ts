import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { HappyHoursService } from "@/backend/services/happy-hours.service";
import {
  happyHourCreateSchema,
  happyHourUpdateSchema,
} from "@/backend/validations/happy-hours.validation";
import { created, noContent, ok } from "@/backend/utils/apiResponse";

export async function listHappyHours() {
  try {
    return ok(await HappyHoursService.list());
  } catch (error) {
    return handleError(error);
  }
}

export async function createHappyHour(req: NextRequest) {
  try {
    const dto = validate(happyHourCreateSchema, await req.json());
    return created(await HappyHoursService.create(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateHappyHour(req: NextRequest, happyHourId: string) {
  try {
    const dto = validate(happyHourUpdateSchema, await req.json());
    return ok(await HappyHoursService.update(happyHourId, dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteHappyHour(happyHourId: string) {
  try {
    await HappyHoursService.delete(happyHourId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
