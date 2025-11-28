import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district");
  const kind = searchParams.get("kind");
  const q = searchParams.get("q");

  const url = new URL("/public/citizens", API_BASE);
  if (district) url.searchParams.set("district", district);
  if (kind) url.searchParams.set("kind", kind);
  if (q) url.searchParams.set("q", q);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Public citizens proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public citizens" },
      { status: 502 }
    );
  }
}


