import { createAdminClient } from "@/config/supabase/server";
import { GuestQueueAggregate } from "./guest-queue.aggregate";

export class TableAllocationService {
  /**
   * Processes a ReservationConfirmed event and assigns an optimal table.
   * This is fully decoupled from the reservation creation flow.
   */
  static async allocateForReservation(restaurantId: string, reservationId: string, partySize: number): Promise<void> {
    const supabase = createAdminClient();
    
    // Simplistic stub for now. Real implementation checks overlapping sessions, status=available, etc.
    const { data: tables } = await supabase
      .from("restaurant_tables")
      .select("id, seating_capacity")
      .eq("restaurant_id", restaurantId)
      .eq("status", "available")
      .gte("seating_capacity", partySize)
      .order("seating_capacity", { ascending: true })
      .limit(1);

    if (tables && tables.length > 0) {
      const tableId = tables[0].id;
      
      // We would update a reservation_tables mapping here or similar
      // For now, we just emit the allocated event
      await GuestQueueAggregate.emitEvent(
        supabase, 
        "RESERVATION", 
        reservationId, 
        "ReservationAllocated", 
        { reservationId, tableId }
      );
    }
  }
}
