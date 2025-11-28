import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.CITY_API_BASE_URL || process.env.INTERNAL_API_URL;

export async function GET(_req: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "CITY_API_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${API_BASE}/city/rooms`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("City rooms proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch city rooms" },
      { status: 502 }
    );
  }
}

