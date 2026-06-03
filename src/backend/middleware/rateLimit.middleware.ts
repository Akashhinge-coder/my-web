export type RateLimitIdentity = {
  ip?: string;
  restaurantId?: string;
};

export function rateLimitKey(identity: RateLimitIdentity) {
  return `${identity.restaurantId ?? "platform"}:${identity.ip ?? "unknown"}`;
}
