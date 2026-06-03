import { NextRequest } from "next/server";
import { updateSettingsProfile } from "@/backend/controllers/settings.controller";

export async function PATCH(req: NextRequest) {
  return updateSettingsProfile(req);
}
