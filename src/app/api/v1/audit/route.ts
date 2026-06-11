import { NextRequest, NextResponse } from "next/server";
import { PlatformService } from "@/backend/services/platform.service";
import { AuditService } from "@/backend/services/audit.service";
import { handleError } from "@/backend/errors/handler";
import { checkRateLimit, RATE_LIMITS } from "@/backend/utils/rateLimiter";
import { ok } from "@/backend/utils/apiResponse";

export const dynamic = "force-dynamic";

function getIdentityKey(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${ip}:audit:read`;
}

export async function GET(req: NextRequest) {
  // Rate limit first — before any DB or auth work
  const key = getIdentityKey(req);
  const limit = checkRateLimit(key, RATE_LIMITS.AUDIT_READ);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    // Verify superadmin access — throws 403 if not superadmin
    await PlatformService.assertSuperadminAccess();

    const { searchParams } = req.nextUrl;
    const action = searchParams.get("action") ?? undefined;
    const targetType = searchParams.get("targetType") ?? undefined;
    const targetId = searchParams.get("targetId") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 500) : 100;

    const logs = await AuditService.listLogs({ action, targetType, targetId, limit });
    return ok(logs);
  } catch (error) {
    return handleError(error);
  }
}
