import { NextRequest } from "next/server";
// Force hot reload
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { createClient } from "@/config/supabase/server";
import { GuestQueueAggregate } from "@/backend/services/guest-queue.aggregate";
import { ReservationAvailabilityEngine } from "@/backend/services/reservation-availability.engine";
import { createReservationRequestSchema } from "@/backend/validations/guest-queue.validation";
import { created, fail } from "@/backend/utils/apiResponse";

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const supabase = await createClient();
    
    // Resolve Restaurant ID from slug (public read policy allows this)
    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .select("id, max_reservation_days_in_advance, online_reservation_limit_percent, minimum_notice_minutes")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .single();

    if (error || !restaurant) {
      return fail("NOT_FOUND", "Restaurant not found.", 404);
    }

    const dto = validate(createReservationRequestSchema, await req.json());

    // Evaluate availability using the pure engine
    // Stubbing existing reservations and tables for now
    const availability = ReservationAvailabilityEngine.evaluate(
      {
        max_reservation_days_in_advance: restaurant.max_reservation_days_in_advance,
        online_reservation_limit_percent: restaurant.online_reservation_limit_percent,
        minimum_notice_minutes: restaurant.minimum_notice_minutes || 30
      },
      [], // existingReservations
      [{ id: "dummy", seating_capacity: 100 }], // tables (giving it a high dummy capacity to pass validation)
      [], // blocked tables
      { party_size: dto.party_size, requested_time: dto.requested_time }
    );

    if (!availability.available) {
      return fail("BAD_REQUEST", availability.reason || "Not available.", 400, { alternativeSlots: availability.alternative_slots });
    }

    const request = await GuestQueueAggregate.requestReservation(restaurant.id, dto);

    return created(request);
  } catch (error) {
    return handleError(error);
  }
}
