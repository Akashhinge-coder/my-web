import { NextRequest } from "next/server";
import { bootstrapSession } from "@/backend/controllers/session.controller";

export async function POST(req: NextRequest) {
  return bootstrapSession(req);
}
