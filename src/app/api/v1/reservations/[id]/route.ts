import { NextRequest } from "next/server";
import { updateReservation } from "@/backend/controllers/reservations.controller";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return updateReservation(req, params.id);
}
