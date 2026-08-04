import { GatewayConfig } from './gateways/PaymentGateway';

interface CacheEntry {
  config: GatewayConfig;
  expiresAt: number;
}

export class CredentialCache {
  private static instance: CredentialCache;
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;

  private constructor() {
    const ttlSeconds = parseInt(process.env.PAYMENT_CACHE_TTL || '300', 10);
    this.ttlMs = ttlSeconds * 1000;
  }

  public static getInstance(): CredentialCache {
    if (!CredentialCache.instance) {
      CredentialCache.instance = new CredentialCache();
    }
    return CredentialCache.instance;
  }

  /**
   * Generates a cache key based on restaurantId and provider.
   */
  private generateKey(restaurantId: string, provider: string): string {
    return `${restaurantId}:${provider}`;
  }

  /**
   * Stores the decrypted gateway config in memory.
   */
  public set(restaurantId: string, provider: string, config: GatewayConfig): void {
    const key = this.generateKey(restaurantId, provider);
    this.cache.set(key, {
      config,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  /**
   * Retrieves the config from cache if it exists and hasn't expired.
   */
  public get(restaurantId: string, provider: string): GatewayConfig | null {
    const key = this.generateKey(restaurantId, provider);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.config;
  }

  /**
   * Invalidates a specific config (e.g., when a restaurant rotates keys).
   */
  public invalidate(restaurantId: string, provider: string): void {
    this.cache.delete(this.generateKey(restaurantId, provider));
  }

  /**
   * Clears the entire cache.
   */
  public clear(): void {
    this.cache.clear();
  }
}
