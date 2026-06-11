import { getAuthSession } from "@/backend/controllers/auth.controller";

export const dynamic = "force-dynamic";

export async function GET() {
  return getAuthSession();
}
