export enum PaymentEvent {
  CREATE = "CREATE",
  AUTHORIZE = "AUTHORIZE",
  CAPTURE = "CAPTURE",
  FAIL = "FAIL",
  CANCEL = "CANCEL",
  EXPIRE = "EXPIRE",
  REFUND = "REFUND",
}

export type PaymentState = 
  | "created" 
  | "pending" 
  | "authorized" 
  | "captured" 
  | "failed" 
  | "cancelled" 
  | "expired" 
  | "refunded";

export class PaymentStateMachine {
  private static transitions: Record<PaymentState, Partial<Record<PaymentEvent, PaymentState>>> = {
    created: {
      [PaymentEvent.CREATE]: "pending",
      [PaymentEvent.FAIL]: "failed",
      [PaymentEvent.CANCEL]: "cancelled",
    },
    pending: {
      [PaymentEvent.AUTHORIZE]: "authorized",
      [PaymentEvent.CAPTURE]: "captured",
      [PaymentEvent.FAIL]: "failed",
      [PaymentEvent.CANCEL]: "cancelled",
      [PaymentEvent.EXPIRE]: "expired",
    },
    authorized: {
      [PaymentEvent.CAPTURE]: "captured",
      [PaymentEvent.FAIL]: "failed",
      [PaymentEvent.CANCEL]: "cancelled",
    },
    captured: {
      [PaymentEvent.REFUND]: "refunded",
    },
    failed: {},
    cancelled: {},
    expired: {},
    refunded: {},
  };

  static transition(currentState: PaymentState, event: PaymentEvent): PaymentState {
    const nextState = this.transitions[currentState][event];
    if (!nextState) {
      throw new Error(`Invalid transition: Cannot perform ${event} from state ${currentState}`);
    }
    return nextState;
  }
}
