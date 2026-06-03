import { apiFetch } from "@/frontend/api/http";
import type { PaymentMethod } from "@/types/domain";
import type { BillingDashboard, BillingPaymentResult } from "@/types/billing";

export const billingApi = {
  getDashboard(): Promise<BillingDashboard> {
    return apiFetch<BillingDashboard>("/api/v1/billing");
  },

  confirmPayment(params: {
    sessionId: string;
    method: PaymentMethod;
    amountPaid?: number;
  }): Promise<BillingPaymentResult> {
    return apiFetch<BillingPaymentResult>("/api/v1/billing", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};
