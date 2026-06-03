import { NextRequest } from "next/server";
import {
  deleteStaffMember,
  updateStaffMember,
} from "@/backend/controllers/staff.controller";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateStaffMember(req, params.id);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return deleteStaffMember(params.id);
}
