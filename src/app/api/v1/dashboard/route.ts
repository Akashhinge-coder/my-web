import { getDashboard } from "@/backend/controllers/dashboard.controller";

export async function GET() {
  return getDashboard();
}
