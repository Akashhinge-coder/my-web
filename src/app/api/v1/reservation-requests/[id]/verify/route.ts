import { NextRequest } from "next/server";
import { approveReservation } from "@/backend/controllers/reservations.controller";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return approveReservation(req, params.id);
}
