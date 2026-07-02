import { createAdminClient } from "@/config/supabase/server";

export type OutboxActorType = 'SYSTEM' | 'WEBHOOK' | 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'CRON';

export interface AuditEventPayload {
  paymentId: string;
  eventType: string;
  aggregateId: string;
  actorType: OutboxActorType;
  actorId?: string;
  payload: any;
}

export class PaymentAuditService {
  static async logEvent(
    event: AuditEventPayload,
    txClient?: any
  ): Promise<void> {
    const supabase = txClient || createAdminClient();

    const { error } = await supabase.from("payment_events").insert({
      payment_id: event.paymentId,
      event_type: event.eventType,
      aggregate_type: 'PAYMENT',
      aggregate_id: event.aggregateId,
      actor_type: event.actorType,
      actor_id: event.actorId,
      payload: event.payload,
      schema_version: event.payload.schemaVersion || 1,
    });

    if (error) {
      console.error("Failed to log payment event:", error);
      // We explicitly throw here so the transaction fails if audit fails
      throw new Error("Audit logging failed");
    }
  }
}
