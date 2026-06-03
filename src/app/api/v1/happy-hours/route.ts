import { NextRequest } from "next/server";
import {
  createHappyHour,
  listHappyHours,
} from "@/backend/controllers/happy-hours.controller";

export async function GET() {
  return listHappyHours();
}

export async function POST(req: NextRequest) {
  return createHappyHour(req);
}
