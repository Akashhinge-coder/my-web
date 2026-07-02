import { getDashboard } from "@/backend/controllers/dashboard.controller";

export const dynamic = 'force-dynamic';
export async function GET() {
  return getDashboard();
}
