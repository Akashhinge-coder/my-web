import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { requirePermission } from "@/backend/middleware/iam.middleware";
import { ReservationsService } from "@/backend/services/reservations.service";
import { GuestQueueAggregate } from "@/backend/services/guest-queue.aggregate";
import {
  createReservationRequestSchema,
  updateReservationRequestStatusSchema,
} from "@/backend/validations/guest-queue.validation";
import { created, ok } from "@/backend/utils/apiResponse";

// Read views (uses old service for now since it returns the read model)
export async function getReservationsPage() {
  try {
    await requirePermission("reservations.manage");
    return ok(await ReservationsService.getPageData());
  } catch (error) {
    return handleError(error);
  }
}

// Write operations (uses the new aggregate)
export async function createReservation(req: NextRequest) {
  try {
    const access = await requirePermission("reservations.manage");
    const dto = validate(createReservationRequestSchema, await req.json());
    
    // For admin creating a reservation, we instantly request and verify it.
    const request = await GuestQueueAggregate.requestReservation(access.restaurantId, dto);
    const reservation = await GuestQueueAggregate.verifyReservation(access.restaurantId, request.id);
    return created(reservation);
  } catch (error) {
    return handleError(error);
  }
}

export async function approveReservation(req: NextRequest, requestId: string) {
  try {
    const access = await requirePermission("reservations.manage");
    return ok(await GuestQueueAggregate.verifyReservation(access.restaurantId, requestId));
  } catch (error) {
    return handleError(error);
  }
}

export async function rejectReservation(req: NextRequest, requestId: string) {
  try {
    const access = await requirePermission("reservations.manage");
    await GuestQueueAggregate.expire(access.restaurantId, requestId); // or reject if we add a dedicated reject method, using expire for now
    return ok({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
