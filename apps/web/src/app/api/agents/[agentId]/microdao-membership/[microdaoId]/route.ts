import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.CITY_API_BASE_URL;

export async function DELETE(
  req: NextRequest,
  { params }: { params: { agentId: string; microdaoId: string } }
) {
  if (!API_BASE) {
    return NextResponse.json(
      { error: "CITY_API_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  const { agentId, microdaoId } = params;
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


