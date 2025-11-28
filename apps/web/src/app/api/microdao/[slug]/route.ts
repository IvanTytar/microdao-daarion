import { NextRequest, NextResponse } from "next/server";

const CITY_API_BASE_URL = process.env.CITY_API_BASE_URL || "http://localhost:7001";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const res = await fetch(
      `${CITY_API_BASE_URL}/city/microdao/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("MicroDAO detail proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MicroDAO detail" },
      { status: 502 }
    );
  }
}

