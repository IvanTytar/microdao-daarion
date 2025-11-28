import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.CITY_API_BASE_URL;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "CITY_API_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const { slug } = params;
  try {
    const res = await fetch(
      `${API_BASE}/public/citizens/${encodeURIComponent(slug)}/interaction`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Citizen interaction proxy error:", error);
    return NextResponse.json(
      { error: "Failed to load citizen interaction info" },
      { status: 502 }
    );
  }
}


