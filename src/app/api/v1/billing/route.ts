import { NextRequest } from "next/server";
import {
  confirmBillingPayment,
  getBillingDashboard,
} from "@/backend/controllers/billing.controller";

export async function GET() {
  return getBillingDashboard();
}

export async function POST(req: NextRequest) {
  return confirmBillingPayment(req);
}

