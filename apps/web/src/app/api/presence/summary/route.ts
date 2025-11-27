import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESENCE_AGGREGATOR_URL = process.env.PRESENCE_AGGREGATOR_URL || "http://localhost:8085";

export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${PRESENCE_AGGREGATOR_URL}/presence/summary`, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to connect to presence aggregator", status: upstream.status },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Presence summary proxy error:", error);
    return NextResponse.json(
      { error: "Presence aggregator unavailable" },
      { status: 503 }
    );
  }
}

