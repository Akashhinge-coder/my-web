import { NextRequest } from "next/server";
import { handleError } from "@/backend/errors/handler";
import { validate } from "@/backend/middleware/validation.middleware";
import { BillingService } from "@/backend/services/billing.service";
import { paymentConfirmationSchema } from "@/backend/validations/payment.schema";
import { fail, ok } from "@/backend/utils/apiResponse";

export async function calculateBilling(_req: NextRequest) {
  return fail(
    "PRICING_RECALCULATION_DISABLED",
    "Billing uses persisted checkout pricing and does not calculate totals from subtotal",
    410
  );
}

export async function getBillingDashboard() {
  try {
    return ok(await BillingService.getDashboard());
  } catch (error) {
    return handleError(error);
  }
}

export async function confirmBillingPayment(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = validate(paymentConfirmationSchema, body);
    return ok(await BillingService.confirmPayment(dto));
  } catch (error) {
    return handleError(error);
  }
}
