import { NextResponse } from "next/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";
import { PaymentRepository } from "@/backend/repositories/payment.repository";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const eventId = req.headers.get("x-razorpay-event-id") || payload.id;
    const startTime = Date.now();

    // Log the webhook immediately
    try {
      await PaymentRepository.logWebhookEvent({
        gateway: "razorpay",
        gateway_event_id: eventId,
        event_type: event,
        gateway_payment_id: payload.payload?.payment?.entity?.id || null,
        gateway_order_id: payload.payload?.payment?.entity?.order_id || null,
        payload, // keeping raw payload in logs
        signature,
        status: "received",
        error_message: null
      });
    } catch (e: any) {
      if (e.code === '23505') {
         return NextResponse.json({ success: true, message: "Duplicate ignored" });
      }
      console.warn("Failed to log webhook event:", e.message);
    }

    if (event === "payment.captured") {
      const entity = payload.payload.payment.entity;
      
      try {
        await PaymentService.processWebhook(
          entity.order_id,
          entity.id,
          eventId,
          signature,
          rawBody,
          entity.amount / 100, // convert paise to major unit
          entity.currency
        );
      } catch (e: any) {
         console.error("Webhook processing error:", e);
         // Depending on error, we might want to return 200 to ack but manual intervention
         return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
