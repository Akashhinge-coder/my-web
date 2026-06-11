import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { SettingsService } from "@/backend/services/settings.service";
import { resolveRestaurantAccess } from "@/backend/utils/resolveRestaurantAccess";
import {
  settingsProfileUpdateSchema,
  settingsTaxUpdateSchema,
  settingsUpdateSchema,
} from "@/backend/validations/settings.validation";
import { ok } from "@/backend/utils/apiResponse";

export async function getSettings() {
  try {
    return ok(await SettingsService.getSettings());
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSettings(req: NextRequest) {
  try {
    await resolveRestaurantAccess();
    const dto = validate(settingsUpdateSchema, await req.json());
    return ok(await SettingsService.updateSettings(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSettingsProfile(req: NextRequest) {
  try {
    await resolveRestaurantAccess();
    const dto = validate(settingsProfileUpdateSchema, await req.json());
    return ok(await SettingsService.updateProfile(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSettingsTax(req: NextRequest) {
  try {
    await resolveRestaurantAccess();
    const dto = validate(settingsTaxUpdateSchema, await req.json());
    return ok(await SettingsService.updateTax(dto));
  } catch (error) {
    return handleError(error);
  }
}
