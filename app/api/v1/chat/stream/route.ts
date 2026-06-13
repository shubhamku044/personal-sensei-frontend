export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:8000";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (upstream.body === null) {
      return Response.json(
        { code: "proxy_error", message: "Backend returned an empty response." },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  } catch {
    return Response.json(
      { code: "proxy_error", message: "Failed to reach the backend service." },
      { status: 502 },
    );
  }
}
