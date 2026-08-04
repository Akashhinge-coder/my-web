export interface NotificationPayload {
  templateId: string;
  recipient: {
    name: string;
    phone: string;
    language?: string;
  };
  data: Record<string, any>;
}

export class NotificationService {
  /**
   * Enqueues a notification using a versioned template ID (e.g., 'reservation_confirmed_v1').
   * In a real implementation, this pushes to a queue or third-party service (e.g., Twilio, WhatsApp).
   */
  static async enqueue(payload: NotificationPayload) {
    // Stub implementation
    console.log(`[NotificationService] Enqueued ${payload.templateId} to ${payload.recipient.phone}`);
    return { queued: true, template: payload.templateId };
  }
}
