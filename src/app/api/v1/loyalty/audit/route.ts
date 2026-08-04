import { NextResponse } from "next/server";
import { LoyaltyService } from "@/backend/services/loyalty.service";
import { AuthError } from "@/backend/errors/AuthError";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const transactions = await LoyaltyService.listTransactions({ accountId, limit, offset });
    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
