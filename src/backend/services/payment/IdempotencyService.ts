import { createAdminClient } from "@/config/supabase/server";
import { PaymentHasher } from "./PaymentHasher";

export class IdempotencyService {
  /**
   * Attempts to lock an idempotency key.
   * If it already exists, returns the cached response.
   * Otherwise, returns null, meaning the caller should proceed with execution.
   */
  static async checkOrLock(key: string, expiryHours: number = 24): Promise<{ locked: boolean; cachedResponse?: any }> {
    const hashedKey = PaymentHasher.hashIdempotencyKey(key);
    const supabase = createAdminClient();

    // Atomic lock acquisition
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 min lock
    const { error: insertError } = await supabase
      .from("payment_idempotency_keys")
      .insert({
        hashed_key: hashedKey,
        response_status: 102, // HTTP 102 Processing
        response_body: {},
        response_headers: {},
        expires_at: expiresAt
      });

    if (insertError) {
      if (insertError.code === "23505") { // Postgres unique_violation
        // Another request holds the lock or already finished
        const { data: existing } = await supabase
          .from("payment_idempotency_keys")
          .select("*")
          .eq("hashed_key", hashedKey)
          .single();

        if (existing) {
          if (existing.response_status === 102) {
            // Still processing, throw error so caller backs off
            throw new Error("Concurrent request processing idempotency key");
          }
          // Already processed, return cached response
          return { locked: true, cachedResponse: { status: existing.response_status, body: existing.response_body, headers: existing.response_headers } };
        }
      }
      throw insertError;
    }

    return { locked: false };
  }

  /**
   * Saves the response for a successful execution of an idempotency key.
   */
  static async saveResponse(key: string, status: number, body: any, headers: Record<string, string> = {}, expiryHours: number = 24): Promise<void> {
    const hashedKey = PaymentHasher.hashIdempotencyKey(key);
    const supabase = createAdminClient();
    
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("payment_idempotency_keys")
      .upsert({
        hashed_key: hashedKey,
        response_status: status,
        response_body: body,
        response_headers: headers,
        expires_at: expiresAt
      }, { onConflict: "hashed_key" });

    if (error) {
      console.error("Failed to save idempotency response:", error);
    }
  }
}
