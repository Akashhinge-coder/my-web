export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { PaymentService } from "@/backend/services/payment/PaymentService";
import { RazorpayGateway } from "@/backend/services/payment/gateways/RazorpayGateway";
import crypto from "crypto";

export async function GET() {
  const supabase = createAdminClient();
  const logs = [];
  const log = (msg) => logs.push(msg);

  try {
    log("Starting Automated Backend Tests...");

    // Setup Test Data
    const mockSessionId = "test_sess_" + Date.now();
    const mockRestaurantId = "test_rest_" + Date.now();
    const mockOrderId = "order_" + Date.now();

    // ==========================================
    // TEST 1: Secret Rotation (Grace Period)
    // ==========================================
    log("\n--- TEST 1: Secret Rotation ---");
    // Mock the Gateway with old and new secrets
    const gateway = new RazorpayGateway({
      webhookSecret: "new_secret_123",
      previousWebhookSecret: "old_secret_456",
      previousValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hrs from now
    } as any);

    const mockPayload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123", amount: 1000, currency: "INR", order_id: "order_123" } } } });

    // Helper to generate signature
    const generateSignature = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

    // Case A: Inside Grace Period (Old Secret)
    const oldSig = generateSignature(mockPayload, "old_secret_456");
    const validOld = gateway.verifyWebhook(mockPayload, oldSig);
    if (validOld) log("PASS: Webhook with old secret ACCEPTED within grace period.");
    else log("FAIL: Webhook with old secret REJECTED within grace period.");

    // Case B: Outside Grace Period (Expired Secret)
    const gatewayExpired = new RazorpayGateway({
      webhookSecret: "new_secret_123",
      previousWebhookSecret: "old_secret_456",
      previousValidUntil: new Date(Date.now() - 1000) // Expired
    } as any);
    const validExpired = gatewayExpired.verifyWebhook(mockPayload, oldSig);
    if (!validExpired) log("PASS: Webhook with old secret REJECTED outside grace period.");
    else log("FAIL: Webhook with old secret ACCEPTED outside grace period.");

    // ==========================================
    // TEST 2: Idempotency duplicate request
    // ==========================================
    log("\n--- TEST 2: Idempotency ---");
    // Simulate duplicate request logic by mocking the redis/db idempotency layer
    const outboxEventId = "outbox_" + Date.now();
    const { error: outboxErr1 } = await supabase.from("transactional_outbox").insert({
      id: outboxEventId,
      event_type: "PAYMENT_COMPLETED",
      aggregate_id: "agg_123",
      aggregate_type: "PAYMENT",
      payload: { test: true }
    });
    if (outboxErr1) log("FAIL: First outbox insert failed.");
    else log("PASS: First outbox insert succeeded.");

    const { error: outboxErr2 } = await supabase.from("transactional_outbox").insert({
      id: outboxEventId,
      event_type: "PAYMENT_COMPLETED",
      aggregate_id: "agg_123",
      aggregate_type: "PAYMENT",
      payload: { test: true }
    });
    if (outboxErr2 && outboxErr2.code === '23505') log("PASS: Duplicate outbox event blocked by unique constraint.");
    else log("FAIL: Duplicate outbox event allowed!");

    return NextResponse.json({ success: true, logs }, { status: 200 });

  } catch (err) {
    log(`ERROR: ${err.message}`);
    return NextResponse.json({ success: false, logs, error: err.message, stack: err.stack }, { status: 200 });
  }
}
