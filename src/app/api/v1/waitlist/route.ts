import { NextRequest } from "next/server";
import { addWaitlistGuest, getWaitlistPage } from "@/backend/controllers/waitlist.controller";

export async function GET() {
  return getWaitlistPage();
}

export async function POST(req: NextRequest) {
  return addWaitlistGuest(req);
}
