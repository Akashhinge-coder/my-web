import { NextRequest } from "next/server";
import { updateWaitlistEntry } from "@/backend/controllers/waitlist.controller";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return updateWaitlistEntry(req, params.id);
}
