import { NextRequest } from "next/server";
import { getFeedbackDashboard } from "@/backend/controllers/feedback.controller";

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  return getFeedbackDashboard(req);
}
