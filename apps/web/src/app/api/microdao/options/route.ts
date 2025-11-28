import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

export async function GET(_req: NextRequest) {

  try {
    const res = await fetch(`${API_BASE}/api/v1/microdao/options`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("MicroDAO options proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MicroDAO options" },
      { status: 502 }
    );
  }
}


