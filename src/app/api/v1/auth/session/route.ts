import { getAuthSession } from "@/backend/controllers/auth.controller";

export async function GET() {
  return getAuthSession();
}
