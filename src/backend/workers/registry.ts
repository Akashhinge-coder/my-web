import { 
  ReservationExpiryWorker, 
  ReservationReminderWorker, 
  ReservationNoShowWorker, 
  WaitlistPromotionWorker, 
  ReservationCleanupWorker 
} from './reservation-background.workers';

export interface IWorker {
  name: string;
  run(payload?: any): Promise<void>;
}

export class WorkerRegistry {
  private static workers = new Map<string, IWorker>();

  // Statically register known workers for now
  static {
    this.register(new ReservationExpiryWorker());
    this.register(new ReservationReminderWorker());
    this.register(new ReservationNoShowWorker());
    this.register(new WaitlistPromotionWorker());
    this.register(new ReservationCleanupWorker());
  }

  static register(worker: IWorker) {
    this.workers.set(worker.name, worker);
  }

  static get(name: string): IWorker | undefined {
    return this.workers.get(name);
  }

  static getNames(): string[] {
    return Array.from(this.workers.keys());
  }
}
