import { NextRequest } from "next/server";
import { getMenu } from "@/backend/controllers/menu.controller";

export async function GET(req: NextRequest) {
  return getMenu(req);
}
