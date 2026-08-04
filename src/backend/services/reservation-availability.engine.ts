import { Restaurant, Reservation, Table, ReservationRequest } from "@/types/domain";

export interface AvailabilityResult {
  available: boolean;
  reason: string | null;
  recommended_tables: string[];
  alternative_slots: string[];
  quota_remaining: number;
  capacity_remaining: number;
}

export class ReservationAvailabilityEngine {
  /**
   * Deterministically calculates if a reservation request can be accommodated.
   * 100% pure function with no side effects.
   */
  static evaluate(
    settings: Pick<Restaurant, "max_reservation_days_in_advance" | "online_reservation_limit_percent" | "minimum_notice_minutes">,
    existingReservations: Pick<Reservation, "party_size" | "reserved_at">[],
    tables: Pick<Table, "id" | "seating_capacity">[],
    blockedTableIds: string[],
    request: Pick<ReservationRequest, "party_size" | "requested_time">
  ): AvailabilityResult {
    const now = new Date();
    const requestedDate = new Date(request.requested_time);
    const msInAdvance = requestedDate.getTime() - now.getTime();
    const daysInAdvance = msInAdvance / (1000 * 60 * 60 * 24);
    const minutesInAdvance = msInAdvance / (1000 * 60);

    // Timeframe Rules
    if (minutesInAdvance < 0) {
      return { available: false, reason: "Cannot book in the past.", recommended_tables: [], alternative_slots: [], quota_remaining: 0, capacity_remaining: 0 };
    }

    if (minutesInAdvance < settings.minimum_notice_minutes) {
      return { available: false, reason: `Requires at least ${settings.minimum_notice_minutes} minutes notice.`, recommended_tables: [], alternative_slots: [], quota_remaining: 0, capacity_remaining: 0 };
    }

    if (daysInAdvance > settings.max_reservation_days_in_advance) {
      return { available: false, reason: `Cannot book more than ${settings.max_reservation_days_in_advance} days in advance.`, recommended_tables: [], alternative_slots: [], quota_remaining: 0, capacity_remaining: 0 };
    }

    // Capacity Rules (Simplified deterministic check)
    // 1. Calculate total available capacity from tables (ignoring blocked)
    const availableTables = tables.filter(t => !blockedTableIds.includes(t.id));
    const totalCapacity = availableTables.reduce((sum, t) => sum + t.seating_capacity, 0);

    // 2. Determine overlapping reservations (e.g. within 2 hours of requested time)
    const overlappingReservations = existingReservations.filter(r => {
      const rTime = new Date(r.reserved_at).getTime();
      return Math.abs(rTime - requestedDate.getTime()) < 2 * 60 * 60 * 1000;
    });

    const currentlyReservedCapacity = overlappingReservations.reduce((sum, r) => sum + r.party_size, 0);

    // 3. Quota check
    const onlineQuota = Math.floor(totalCapacity * (settings.online_reservation_limit_percent / 100));
    const quotaRemaining = onlineQuota - currentlyReservedCapacity;
    const capacityRemaining = totalCapacity - currentlyReservedCapacity;

    if (request.party_size > quotaRemaining) {
      // Suggest alternatives (stub: next hour)
      const alt1 = new Date(requestedDate); alt1.setHours(alt1.getHours() + 1);
      return {
        available: false,
        reason: "Insufficient capacity for this time slot based on online quotas.",
        recommended_tables: [],
        alternative_slots: [alt1.toISOString()],
        quota_remaining: Math.max(0, quotaRemaining),
        capacity_remaining: Math.max(0, capacityRemaining)
      };
    }

    // Table recommendations (find tables that can fit the party)
    const recommended = availableTables
      .filter(t => t.seating_capacity >= request.party_size)
      .sort((a, b) => a.seating_capacity - b.seating_capacity)
      .map(t => t.id)
      .slice(0, 2);

    return { 
      available: true, 
      reason: null, 
      recommended_tables: recommended, 
      alternative_slots: [],
      quota_remaining: quotaRemaining - request.party_size,
      capacity_remaining: capacityRemaining - request.party_size
    };
  }
}
