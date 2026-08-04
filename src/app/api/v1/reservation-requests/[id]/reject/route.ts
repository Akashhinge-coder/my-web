import { NextRequest } from "next/server";
import { rejectReservation } from "@/backend/controllers/reservations.controller";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return rejectReservation(req, params.id);
}
