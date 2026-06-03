import { z } from "zod";

export const paymentConfirmationSchema = z.object({
  sessionId: z.string().uuid(),
  method: z.enum(["upi", "gpay", "phonepe", "paytm", "cash", "card"]),
  amountPaid: z.coerce.number().nonnegative().optional(),
});

export type PaymentConfirmationDTO = z.infer<typeof paymentConfirmationSchema>;
