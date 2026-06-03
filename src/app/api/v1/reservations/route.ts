import { NextRequest } from "next/server";
import { createReservation, getReservationsPage } from "@/backend/controllers/reservations.controller";

export async function GET() {
  return getReservationsPage();
}

export async function POST(req: NextRequest) {
  return createReservation(req);
}
