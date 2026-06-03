import { NextRequest } from "next/server";
import { getSessionBill } from "@/backend/controllers/order.controller";

export async function GET(req: NextRequest) {
  return getSessionBill(req);
}
