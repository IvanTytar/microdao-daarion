import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESENCE_AGGREGATOR_URL = process.env.PRESENCE_AGGREGATOR_URL || "http://localhost:8085";

export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${PRESENCE_AGGREGATOR_URL}/presence/stream`, {
      headers: {
        accept: "text/event-stream",
      },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to connect to presence aggregator" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const readable = new ReadableStream({
      start(controller) {
        const reader = upstream.body!.getReader();

        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            push();
          }).catch((err) => {
            console.error("SSE proxy error:", err);
            controller.close();
          });
        }

        push();
      },
      cancel() {
        upstream.body?.cancel();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("SSE proxy connection error:", error);
    return new Response(
      JSON.stringify({ error: "Presence aggregator unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}


