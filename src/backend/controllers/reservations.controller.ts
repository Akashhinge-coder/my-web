import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { ReservationsService } from "@/backend/services/reservations.service";
import {
  createReservationSchema,
  updateReservationStatusSchema,
} from "@/backend/validations/reservations.validation";
import { created, ok } from "@/backend/utils/apiResponse";

export async function getReservationsPage() {
  try {
    return ok(await ReservationsService.getPageData());
  } catch (error) {
    return handleError(error);
  }
}

export async function createReservation(req: NextRequest) {
  try {
    const dto = validate(createReservationSchema, await req.json());
    return created(await ReservationsService.create(dto));
  } catch (error) {
    return handleError(error);
  }
}

export async function updateReservation(req: NextRequest, reservationId: string) {
  try {
    const dto = validate(updateReservationStatusSchema, await req.json());
    return ok(await ReservationsService.updateStatus(reservationId, dto));
  } catch (error) {
    return handleError(error);
  }
}
