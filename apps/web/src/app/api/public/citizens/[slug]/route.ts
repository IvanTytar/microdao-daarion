import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {

  const { slug } = await params;

  try {
    const res = await fetch(
      `${API_BASE}/public/citizens/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Public citizen proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch citizen profile" },
      { status: 502 }
    );
  }
}


