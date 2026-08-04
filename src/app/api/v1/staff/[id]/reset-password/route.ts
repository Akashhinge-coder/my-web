import { NextRequest } from "next/server";
import { resetStaffPassword } from "@/backend/controllers/staff.controller";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return resetStaffPassword(params.id);
}
