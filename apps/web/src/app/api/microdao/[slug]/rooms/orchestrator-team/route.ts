import { NextRequest, NextResponse } from "next/server";

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

/**
 * POST /api/microdao/[slug]/rooms/orchestrator-team
 * Ensure Orchestrator Team Room exists
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const authHeader = request.headers.get("Authorization");

    const response = await fetch(`${CITY_API_URL}/city/microdao/${slug}/ensure-orchestrator-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader || "",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to ensure orchestrator room:", response.status, text);
      return NextResponse.json(
        { error: "Failed to ensure room", detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error ensuring orchestrator room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

