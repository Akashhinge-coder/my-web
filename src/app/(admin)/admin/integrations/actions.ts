"use server";

import { createAdminClient } from "@/config/supabase/server";
import { encryptString } from "@/backend/utils/encryption";
import { RazorpayGateway } from "@/backend/services/payment/gateways/RazorpayGateway";
import { CredentialCache } from "@/backend/services/payment/CredentialCache";
import { revalidatePath } from "next/cache";

export async function testRazorpayConnection(keyId: string, keySecret: string, mode: 'TEST' | 'LIVE') {
  try {
    const gateway = new RazorpayGateway({
      keyId,
      keySecret,
      mode,
    });
    
    const result = await gateway.testConnection();
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveRazorpayConfig(
  restaurantId: string, 
  keyId: string, 
  keySecret: string, 
  webhookSecret: string | null, 
  mode: 'TEST' | 'LIVE'
) {
  const { createClient } = await import("@/config/supabase/server");
  const supabaseSession = await createClient();
  const { data: { user } } = await supabaseSession.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const actorId = user.id;

  // 1. Validate connection before saving
  const testResult = await testRazorpayConnection(keyId, keySecret, mode);
  if (!testResult.success) {
    throw new Error("Invalid Razorpay credentials: " + testResult.error);
  }

  const supabase = createAdminClient();

  // 2. Encrypt Secrets
  const encryptedSecret = encryptString(keySecret);
  const encryptedWebhookSecret = webhookSecret ? encryptString(webhookSecret) : null;

  // 3. Fetch existing to handle versioning
  const { data: existing } = await supabase
    .from('restaurant_payment_integrations')
    .select('id, secret_version, status, encrypted_secret, encrypted_webhook_secret')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'razorpay')
    .single();

  const metadata = {
    merchantName: testResult.merchantName || "Unknown",
    verifiedAt: new Date().toISOString()
  };

  let integrationId = existing?.id;
  let secretVersion = 1;

  if (existing) {
    secretVersion = existing.secret_version + 1;
    
    // Audit: Secret Rotation Started
    await supabase.from('integration_events').insert({
      integration_id: existing.id,
      restaurant_id: restaurantId,
      event_type: 'SECRET_ROTATION_STARTED',
      actor_id: actorId,
      ip_address: "server_action"
    });

    const previousValidUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours grace

    await supabase
      .from('restaurant_payment_integrations')
      .update({
        mode,
        status: 'ACTIVE',
        key_id: keyId,
        encrypted_secret: encryptedSecret,
        encrypted_webhook_secret: encryptedWebhookSecret,
        secret_version: secretVersion,
        previous_encrypted_secret: existing.encrypted_secret,
        previous_encrypted_webhook_secret: existing.encrypted_webhook_secret,
        previous_secret_version: existing.secret_version,
        previous_valid_until: previousValidUntil,
        last_rotated_at: new Date().toISOString(),
        rotated_by: actorId,
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    const { data: newRecord, error } = await supabase
      .from('restaurant_payment_integrations')
      .insert({
        restaurant_id: restaurantId,
        provider: 'razorpay',
        mode,
        status: 'ACTIVE',
        authentication_type: 'API_KEYS',
        key_id: keyId,
        encrypted_secret: encryptedSecret,
        encrypted_webhook_secret: encryptedWebhookSecret,
        secret_version: 1,
        last_rotated_at: new Date().toISOString(),
        rotated_by: actorId,
        metadata
      })
      .select('id')
      .single();

    if (error) throw new Error("Failed to save integration: " + error.message);
    integrationId = newRecord.id;
  }

  // 4. Log Audit Event
  await supabase
    .from('integration_events')
    .insert({
      integration_id: integrationId,
      restaurant_id: restaurantId,
      event_type: existing ? 'SECRET_ROTATION_COMPLETED' : 'INTEGRATION_CREATED',
      actor_id: actorId,
      ip_address: "server_action"
    });

  // 5. Invalidate the credential cache immediately to prevent stale keys for 5 minutes
  CredentialCache.getInstance().invalidate(restaurantId, 'razorpay');

  revalidatePath('/admin/integrations');
  return { success: true };
}

export async function fetchIntegrationStatus(restaurantId: string, provider: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('restaurant_payment_integrations')
    .select('status, mode, last_rotated_at, metadata')
    .eq('restaurant_id', restaurantId)
    .eq('provider', provider)
    .single();
    
  return data;
}
