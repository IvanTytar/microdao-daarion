import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; microdaoId: string }> }
) {

  const { agentId, microdaoId } = await params;
  const accessToken = req.cookies.get("daarion_access_token")?.value;
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/agents/${encodeURIComponent(
        agentId
      )}/microdao-membership/${encodeURIComponent(microdaoId)}`,
      {
        method: "DELETE",
        headers,
      }
    );

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Remove microdao membership proxy error:", error);
    return NextResponse.json(
      { error: "Failed to remove MicroDAO membership" },
      { status: 502 }
    );
  }
}


