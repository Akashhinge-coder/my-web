import { NextResponse, NextRequest } from "next/server";
import { POST } from "../v1/restaurants/[slug]/reservations/route";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // create a mock request to POST handler
    const mockReq = new NextRequest(new URL("http://localhost:3000/api/v1/restaurants/akash/reservations"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_name: "Test",
        phone: "123",
        party_size: 2,
        requested_time: new Date(Date.now() + 86400000).toISOString() // tomorrow
      })
    });

    const res = await POST(mockReq, { params: { slug: "akash" } });
    const text = await res.text();
    return NextResponse.json({ status: res.status, body: text });

  } catch (error: any) {
    return NextResponse.json({ 
        success: false, 
        error: error, 
        message: error.message, 
        stack: error.stack,
        details: typeof error === 'object' ? JSON.stringify(error) : error
    });
  }
}
