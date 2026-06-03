import { NextRequest } from "next/server";
import {
  createStaffMember,
  listStaff,
} from "@/backend/controllers/staff.controller";

export async function GET() {
  return listStaff();
}

export async function POST(req: NextRequest) {
  return createStaffMember(req);
}
