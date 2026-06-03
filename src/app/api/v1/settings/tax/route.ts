import { NextRequest } from "next/server";
import { updateSettingsTax } from "@/backend/controllers/settings.controller";

export async function PATCH(req: NextRequest) {
  return updateSettingsTax(req);
}
