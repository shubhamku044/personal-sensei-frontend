const BACKEND_URL = process.env["BACKEND_URL"] ?? "http://localhost:8000";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json(
      { code: "proxy_error", message: "Failed to reach the backend service." },
      { status: 502 },
    );
  }
}
