import { createAdminClient } from "@/config/supabase/server";
import { NotFoundError } from "@/backend/errors/NotFoundError";
import { ReservationRequest, Reservation, Waitlist } from "@/types/domain";

export class GuestQueueAggregate {
  /**
   * Helper to emit outbox events.
   */
  static async emitEvent(
    supabase: any,
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: any
  ) {
    await supabase.from("outbox_events").insert({
      aggregate_type: aggregateType,
      aggregate_id: aggregateId,
      event_type: eventType,
      payload,
      status: "PENDING",
    });
  }

  // --- RESERVATION INTENT METHODS ---

  static async requestReservation(
    restaurantId: string,
    data: any
  ): Promise<ReservationRequest> {
    const supabase = createAdminClient();
    const expiresAt = new Date(new Date().getTime() + 30 * 60000).toISOString(); 

    const { data: request, error } = await supabase
      .from("reservation_requests")
      .insert({
        restaurant_id: restaurantId,
        ...data,
        status: "REQUESTED",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    await this.emitEvent(supabase, "RESERVATION_REQUEST", request.id, "ReservationRequested", { request });
    return request;
  }

  static async verifyReservation(restaurantId: string, requestId: string): Promise<Reservation> {
    const supabase = createAdminClient();

    // 1. Update Request to VERIFIED
    const { data: request, error: reqErr } = await supabase
      .from("reservation_requests")
      .update({ status: "VERIFIED" })
      .eq("id", requestId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "REQUESTED")
      .select()
      .single();

    if (reqErr || !request) throw new Error("Could not verify request. It may have expired or been modified.");
    await this.emitEvent(supabase, "RESERVATION_REQUEST", request.id, "ReservationVerified", { request });

    // 2. Create the confirmed Reservation (immutable from this point forward regarding its core request parameters)
    const { data: reservation, error: resErr } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: restaurantId,
        reservation_request_id: request.id,
        guest_name: request.customer_name,
        guest_phone: request.phone,
        party_size: request.party_size,
        reserved_at: request.requested_time,
        status: "CONFIRMED",
        version: 1,
        // copy metadata columns
        occasion: request.occasion,
        preferred_area: request.preferred_area,
        notes: request.notes,
        marketing_source: request.marketing_source,
        device: request.device,
        language: request.language,
        campaign: request.campaign,
        referrer: request.referrer,
        high_chair: request.high_chair,
        wheelchair: request.wheelchair,
      })
      .select()
      .single();

    if (resErr) throw resErr;
    await this.emitEvent(supabase, "RESERVATION", reservation.id, "ReservationConfirmed", { reservation, request });
    return reservation;
  }

  static async confirmReservation(restaurantId: string, reservationId: string): Promise<Reservation> {
    // Manual confirmation bypass for offline reservations
    throw new Error("Not implemented for direct confirmed creation yet. Use verifyReservation for online flow.");
  }

  static async arrive(restaurantId: string, reservationId: string): Promise<Reservation> {
    const supabase = createAdminClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .update({ status: "ARRIVED" })
      .eq("id", reservationId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !reservation) throw new NotFoundError("Reservation not found.");
    await this.emitEvent(supabase, "RESERVATION", reservation.id, "GuestArrived", { reservation });
    return reservation;
  }

  static async seatGuest(restaurantId: string, reservationId: string): Promise<Reservation> {
    const supabase = createAdminClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .update({ status: "SEATED" })
      .eq("id", reservationId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !reservation) throw new NotFoundError("Reservation not found.");
    await this.emitEvent(supabase, "RESERVATION", reservation.id, "GuestSeated", { reservation });
    return reservation;
  }

  static async completeVisit(restaurantId: string, reservationId: string): Promise<Reservation> {
    const supabase = createAdminClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .update({ status: "COMPLETED" })
      .eq("id", reservationId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !reservation) throw new NotFoundError("Reservation not found.");
    await this.emitEvent(supabase, "RESERVATION", reservation.id, "GuestCompletedVisit", { reservation });
    return reservation;
  }

  static async cancel(restaurantId: string, reservationId: string): Promise<Reservation> {
    const supabase = createAdminClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .update({ status: "CANCELLED" })
      .eq("id", reservationId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !reservation) throw new NotFoundError("Reservation not found.");
    await this.emitEvent(supabase, "RESERVATION", reservation.id, "ReservationCancelled", { reservation });
    return reservation;
  }

  static async expire(restaurantId: string, requestId: string): Promise<void> {
    const supabase = createAdminClient();
    const { data: request, error } = await supabase
      .from("reservation_requests")
      .update({ status: "EXPIRED" })
      .eq("id", requestId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !request) throw new NotFoundError("Request not found.");
    await this.emitEvent(supabase, "RESERVATION_REQUEST", request.id, "ReservationExpired", { request });
  }

  static async markNoShow(restaurantId: string, reservationId: string): Promise<Reservation> {
    const supabase = createAdminClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .update({ status: "NO_SHOW" })
      .eq("id", reservationId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !reservation) throw new NotFoundError("Reservation not found.");
    await this.emitEvent(supabase, "RESERVATION", reservation.id, "ReservationNoShow", { reservation });
    return reservation;
  }

  // --- WAITLIST INTENT METHODS ---
  
  static async joinWaitlist(
    restaurantId: string,
    data: any
  ): Promise<Waitlist> {
    const supabase = createAdminClient();
    const { data: entry, error } = await supabase
      .from("waitlist")
      .insert({
        restaurant_id: restaurantId,
        ...data,
        status: "waiting",
      })
      .select()
      .single();

    if (error) throw error;
    await this.emitEvent(supabase, "WAITLIST", entry.id, "WaitlistJoined", { entry });
    return entry;
  }

  static async callNextGuest(restaurantId: string, entryId: string): Promise<Waitlist> {
    const supabase = createAdminClient();
    const { data: entry, error } = await supabase
      .from("waitlist")
      .update({ status: "notified", notified_at: new Date().toISOString() })
      .eq("id", entryId)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error || !entry) throw new NotFoundError("Waitlist entry not found.");
    await this.emitEvent(supabase, "WAITLIST", entry.id, "WaitlistCalled", { entry });
    return entry;
  }
}
