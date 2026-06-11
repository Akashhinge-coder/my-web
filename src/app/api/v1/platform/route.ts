import { NextRequest, NextResponse } from "next/server";
import {
  getPlatformDashboard,
  updateRestaurantActivation,
} from "@/backend/controllers/platform.controller";
import { checkRateLimit, RATE_LIMITS } from "@/backend/utils/rateLimiter";
import { handleError } from "@/backend/errors/handler";
import { AuthError } from "@/backend/errors/AuthError";

function getIdentityKey(req: NextRequest, suffix: string): string {
  // Prefer forwarded IP for rate limiting; fall back to a fixed key.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${ip}:${suffix}`;
}

function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: { code: "RATE_LIMITED", message: "Too many requests. Please retry later." } },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Reset": String(resetAt),
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const key = getIdentityKey(req, "platform:dashboard");
  const limit = checkRateLimit(key, RATE_LIMITS.PLATFORM_DASHBOARD);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  return getPlatformDashboard();
}

export async function PATCH(req: NextRequest) {
  const key = getIdentityKey(req, "platform:activation");
  const limit = checkRateLimit(key, RATE_LIMITS.PLATFORM_ACTIVATION);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  try {
    // Forward the client IP to the controller for audit logging
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;
    return updateRestaurantActivation(req, ip);
  } catch (error) {
    return handleError(error);
  }
}
