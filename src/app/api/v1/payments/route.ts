import { NextRequest } from "next/server";
import { calculateBilling } from "@/backend/controllers/billing.controller";

export async function GET(req: NextRequest) {
  return calculateBilling(req);
}
