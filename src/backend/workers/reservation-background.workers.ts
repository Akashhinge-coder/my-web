import type { IWorker } from './registry';

export class ReservationExpiryWorker implements IWorker {
  name = "reservation-expiry";
  async run() {
    // Finds 'REQUESTED' records past their expires_at and marks them 'EXPIRED'
    console.log("ReservationExpiryWorker running...");
  }
}

export class ReservationReminderWorker implements IWorker {
  name = "reservation-reminders";
  async run() {
    // Finds 'CONFIRMED' reservations within 24h or 2h and sends reminders
    console.log("ReservationReminderWorker running...");
  }
}

export class ReservationNoShowWorker implements IWorker {
  name = "reservation-no-show";
  async run() {
    // Finds 'CONFIRMED' reservations past the no_show_grace_minutes and marks them 'NO_SHOW'
    console.log("ReservationNoShowWorker running...");
  }
}

export class WaitlistPromotionWorker implements IWorker {
  name = "waitlist-promotion";
  async run() {
    // Finds 'waiting' waitlist entries where tables have become available and notifies them
    console.log("WaitlistPromotionWorker running...");
  }
}

export class ReservationCleanupWorker implements IWorker {
  name = "reservation-cleanup";
  async run() {
    // Removes expired holds, archives stale requests, cleans temp allocations
    console.log("ReservationCleanupWorker running...");
  }
}
