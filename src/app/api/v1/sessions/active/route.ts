import { NextRequest } from "next/server";
import { getActiveSession } from "@/backend/controllers/session.controller";

export async function GET(req: NextRequest) {
  return getActiveSession(req);
}
