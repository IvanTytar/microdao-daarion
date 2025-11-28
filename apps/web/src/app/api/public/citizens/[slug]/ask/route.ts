import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.CITY_API_BASE_URL;

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "CITY_API_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const { slug } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetch(
      `${API_BASE}/public/citizens/${encodeURIComponent(slug)}/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Citizen ask proxy error:", error);
    return NextResponse.json(
      { error: "Failed to send question to citizen" },
      { status: 502 }
    );
  }
}


