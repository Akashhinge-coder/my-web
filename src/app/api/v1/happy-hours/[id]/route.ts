import { NextRequest } from "next/server";
import {
  deleteHappyHour,
  updateHappyHour,
} from "@/backend/controllers/happy-hours.controller";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateHappyHour(req, params.id);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return deleteHappyHour(params.id);
}
