import { NextRequest } from "next/server";
import { listSessionOrders } from "@/backend/controllers/order.controller";

export async function GET(req: NextRequest) {
  return listSessionOrders(req);
}
