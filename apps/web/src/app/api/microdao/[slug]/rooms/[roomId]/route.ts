import { NextRequest, NextResponse } from "next/server";

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

/**
 * PATCH /api/microdao/[slug]/rooms/[roomId]
 * Update a MicroDAO room settings
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; roomId: string }> }
) {
  try {
    const { slug, roomId } = await context.params;
    const body = await request.text();

    const response = await fetch(`${CITY_API_URL}/city/microdao/${slug}/rooms/${roomId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to update microdao room:", response.status, text);
      return NextResponse.json(
        { error: "Failed to update room", detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating microdao room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

