import { NextRequest } from "next/server";
import { getSettings, updateSettings } from "@/backend/controllers/settings.controller";

export async function GET() {
  return getSettings();
}

export async function PATCH(req: NextRequest) {
  return updateSettings(req);
}
