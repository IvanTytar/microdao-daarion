import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {

  const { agentId } = await params;
  const accessToken = req.cookies.get("daarion_access_token")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/agents/${encodeURIComponent(
        agentId
      )}/microdao-membership`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      }
    );

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Assign microdao membership proxy error:", error);
    return NextResponse.json(
      { error: "Failed to assign MicroDAO membership" },
      { status: 502 }
    );
  }
}


