import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CITY_SERVICE_URL = process.env.CITY_SERVICE_URL || "http://localhost:7001";

export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${CITY_SERVICE_URL}/city/map`, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      console.error(`City map API error: ${upstream.status}`);
      return NextResponse.json(
        { error: "Failed to fetch city map", status: upstream.status },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("City map proxy error:", error);
    return NextResponse.json(
      { error: "City service unavailable" },
      { status: 503 }
    );
  }
}

