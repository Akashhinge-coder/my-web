import { ok } from "@/backend/utils/apiResponse";

export async function POST() {
  return ok({ queued: true });
}
