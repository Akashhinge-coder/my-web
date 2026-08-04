import { createAdminClient } from '../../../config/supabase/server';
import { decryptString } from '../../utils/encryption';
import { GatewayConfig } from './gateways/PaymentGateway';
import { CredentialCache } from './CredentialCache';

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class GatewayConfigService {
  /**
   * Fetches the GatewayConfig for a given restaurant and provider.
   * Utilizes an in-memory cache to prevent frequent DB hits and decryption overhead.
   */
  public static async getConfig(restaurantId: string, provider: string): Promise<GatewayConfig> {
    const cache = CredentialCache.getInstance();
    
    // 1. Check Cache
    const cachedConfig = cache.get(restaurantId, provider);
    if (cachedConfig) {
      return cachedConfig;
    }

    // 2. Fetch from Database
    const supabase = createAdminClient();
    const { data: integration, error } = await supabase
      .from('restaurant_payment_integrations')
      .select('status, mode, key_id, encrypted_secret, encrypted_webhook_secret, previous_encrypted_secret, previous_encrypted_webhook_secret, previous_valid_until')
      .eq('restaurant_id', restaurantId)
      .eq('provider', provider)
      .is('deleted_at', null)
      .single();

    if (error || !integration) {
      if (process.env.ALLOW_ENV_FALLBACK !== 'false') {
        // Fallback for development/testing if enabled
        return this.getFallbackConfig(provider);
      }
      throw new ConfigurationError(`Restaurant payment gateway not configured for provider: ${provider}`);
    }

    // 3. Validate Status
    if (integration.status !== 'ACTIVE') {
      throw new ConfigurationError(`Payment integration is ${integration.status}. Cannot process payments.`);
    }

    if (!integration.key_id || !integration.encrypted_secret) {
      throw new ConfigurationError(`Payment integration is missing required API keys.`);
    }

    // 4. Decrypt Secrets
    let decryptedSecret: string;
    let decryptedWebhookSecret: string | undefined;
    let previousKeySecret: string | undefined;
    let previousWebhookSecret: string | undefined;

    try {
      decryptedSecret = decryptString(integration.encrypted_secret);
      if (integration.encrypted_webhook_secret) {
        decryptedWebhookSecret = decryptString(integration.encrypted_webhook_secret);
      }
      
      if (integration.previous_encrypted_secret) {
        previousKeySecret = decryptString(integration.previous_encrypted_secret);
      }
      if (integration.previous_encrypted_webhook_secret) {
        previousWebhookSecret = decryptString(integration.previous_encrypted_webhook_secret);
      }
    } catch (err) {
      throw new ConfigurationError(`Failed to decrypt gateway credentials for ${restaurantId}. Ensure APP_ENCRYPTION_KEY is correct.`);
    }

    const config: GatewayConfig = {
      keyId: integration.key_id,
      keySecret: decryptedSecret,
      webhookSecret: decryptedWebhookSecret,
      previousKeySecret,
      previousWebhookSecret,
      previousValidUntil: integration.previous_valid_until ? new Date(integration.previous_valid_until) : undefined,
      mode: integration.mode as 'TEST' | 'LIVE'
    };

    // 5. Save to Cache
    cache.set(restaurantId, provider, config);

    return config;
  }

  /**
   * Provides a fallback config using environment variables if ALLOW_ENV_FALLBACK is true.
   */
  private static getFallbackConfig(provider: string): GatewayConfig {
    if (provider === 'razorpay') {
      return {
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock123',
        keySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
        mode: 'TEST'
      };
    }
    throw new ConfigurationError(`No fallback config available for provider: ${provider}`);
  }
}
