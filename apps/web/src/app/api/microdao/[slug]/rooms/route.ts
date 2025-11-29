import { NextRequest, NextResponse } from "next/server";

const CITY_API_URL = process.env.INTERNAL_API_URL || process.env.CITY_API_BASE_URL || "http://daarion-city-service:7001";

/**
 * GET /api/microdao/[slug]/rooms
 * Get all rooms for a MicroDAO
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    
    const response = await fetch(`${CITY_API_URL}/city/microdao/${slug}/rooms`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to get microdao rooms:", response.status, text);
      return NextResponse.json(
        { error: "Failed to get MicroDAO rooms", detail: text },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting microdao rooms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

