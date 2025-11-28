import { NextRequest, NextResponse } from "next/server";

const CITY_API_BASE_URL = process.env.CITY_API_BASE_URL || "http://localhost:7001";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district");
  const q = searchParams.get("q");

  const url = new URL("/city/microdao", CITY_API_BASE_URL);
  if (district) url.searchParams.set("district", district);
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
    console.error("MicroDAO list proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch MicroDAO list" },
      { status: 502 }
    );
  }
}

