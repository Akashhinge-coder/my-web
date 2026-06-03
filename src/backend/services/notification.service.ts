export class NotificationService {
  static async enqueue(_payload: Record<string, unknown>) {
    return { queued: true };
  }
}
