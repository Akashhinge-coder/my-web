const { PaymentService } = require('./src/backend/services/payment/PaymentService');
const { PaymentRepository } = require('./src/backend/repositories/payment.repository');

async function run() {
  try {
    // 1. Get the latest mock payment
    const { createAdminClient } = require('./src/config/supabase/server');
    const supabase = createAdminClient();
    const { data: payments } = await supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(1);
    
    if (!payments || payments.length === 0) {
      console.log("No payments found");
      return;
    }
    
    const p = payments[0];
    console.log("Found payment:", p.id, "with orderId:", p.gateway_order_id);
    
    if (!p.gateway_order_id) {
      console.log("gateway_order_id is missing on the latest payment!");
      return;
    }

    // 2. Try processing webhook
    const success = await PaymentService.processWebhook(
      p.gateway_order_id,
      "pay_mock_test123",
      "mock_signature",
      "{}",
      p.amount,
      p.currency
    );
    
    console.log("Webhook success:", success);
  } catch (e) {
    console.error("Webhook processing threw an error:", e);
  }
}

// Ensure Node allows importing TS if we use a runner, or we just write this as an API route test!
