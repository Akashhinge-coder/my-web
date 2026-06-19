import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get("text");

  if (!text) {
    return NextResponse.json({ error: "Text parameter is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://inputtools.google.com/request?text=${encodeURIComponent(
        text
      )}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from Google Input Tools");
    }

    const data = await response.json();
    
    if (data[0] === "SUCCESS" && Array.isArray(data[1])) {
      const transliteratedText = data[1]
        .map((item: any) => (item[1] && item[1][0] ? item[1][0] : item[0]))
        .join("");
      return NextResponse.json({ result: transliteratedText });
    } else {
      return NextResponse.json({ result: text });
    }
  } catch (error) {
    console.error("Transliteration error:", error);
    return NextResponse.json({ error: "Failed to transliterate" }, { status: 500 });
  }
}
