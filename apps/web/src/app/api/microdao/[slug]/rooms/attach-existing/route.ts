import { NextRequest, NextResponse } from "next/server";

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

/**
 * POST /api/microdao/[slug]/rooms/attach-existing
 * Attach an existing city room to a MicroDAO
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await request.text();

    const response = await fetch(`${CITY_API_URL}/city/microdao/${slug}/rooms/attach-existing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to attach room to microdao:", response.status, text);
      return NextResponse.json(
        { error: "Failed to attach room", detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error attaching room to microdao:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

